"""Bilan financier admin (CONCEPTION_FRONTEND §10.5, CDC §2.6.5).

Contrats consommés par le frontend (getFinance / refundTransaction) :
- GET  /admin/finance                     → FinanceData { summary, transactions }
- POST /admin/transactions/{id}/refund     → passe la commande en REFUNDED

Accès : Super Admin + Comptable (Manager n'a pas les finances — CDC §2.6.1).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, OrderStatus
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.services.audit_service import audit_service
from app.services.refund_service import NotRefundableError, refund_order

router = APIRouter()

_roles = require_roles(AdminRole.SUPER_ADMIN, AdminRole.COMPTABLE)

# Statuts qui constituent une transaction financière (on exclut FAILED / REJECTED).
_TXN_TO_FRONT = {
    OrderStatus.PAID.value: "paid",
    OrderStatus.MANUAL_VALIDATED.value: "paid",
    OrderStatus.REFUNDED.value: "refunded",
    OrderStatus.PENDING.value: "pending",
    OrderStatus.MANUAL_PENDING.value: "pending",
}


def _parse_uuid(v: str | None) -> uuid.UUID | None:
    if not v:
        return None
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        return None


@router.get("/finance")
async def finance(
    event_id: str | None = Query(None),
    _admin: Admin = Depends(_roles),
    db: AsyncSession = Depends(get_db),
):
    ev = _parse_uuid(event_id)
    stmt = (
        select(Order, Participant.first_name, Participant.last_name, Formula.name)
        .join(Participant, Participant.id == Order.participant_id)
        .join(Formula, Formula.id == Order.formula_id)
        .where(Order.status.in_(list(_TXN_TO_FRONT.keys())))
        .order_by(Order.created_at.desc())
    )
    if ev:
        stmt = stmt.where(Order.event_id == ev)

    transactions = []
    gross = refunded = pending = 0.0
    for order, fn, ln, formula_name in (await db.execute(stmt)).all():
        status = _TXN_TO_FRONT[order.status]
        amount = float(order.amount)
        if status in ("paid", "refunded"):
            gross += amount
        if status == "refunded":
            refunded += amount
        if status == "pending":
            pending += amount
        payment_mode = (order.metadata_ or {}).get("payment_mode") or (
            "manual" if order.payment_provider == "manual" else "digital"
        )
        transactions.append(
            {
                "id": str(order.id),
                "ref": f"ORD-{str(order.id)[:8].upper()}",
                "participant": f"{fn} {ln}",
                "formula": formula_name,
                "amount": amount,
                "currency": order.currency,
                "status": status,
                "payment_mode": payment_mode,
                "created_at": order.created_at.isoformat(),
            }
        )

    summary = {
        "gross": gross,
        "refunded": refunded,
        "net": gross - refunded,
        "pending": pending,
        "currency": "XOF",
    }
    return {"summary": summary, "transactions": transactions}


@router.post("/transactions/{tx_id}/refund")
async def refund_transaction(
    tx_id: str,
    request: Request,
    admin: Admin = Depends(_roles),
    db: AsyncSession = Depends(get_db),
):
    """Rembourse une commande payée → REFUNDED + libère une place (sous verrou)."""
    parsed = _parse_uuid(tx_id)
    if not parsed:
        raise HTTPException(status_code=400, detail="Transaction invalide")
    order = (await db.execute(select(Order).where(Order.id == parsed))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    # Même service que le webhook `payment.refunded` : un remboursement doit avoir
    # exactement le même effet, qu'il vienne de l'admin ou du provider.
    try:
        await refund_order(db, order)
    except NotRefundableError as e:
        raise HTTPException(status_code=409, detail=str(e))

    await audit_service.log(
        db, admin=admin, action="transaction.refund",
        resource_type="order", resource_id=str(order.id),
        payload={"amount": float(order.amount), "currency": order.currency},
        request=request,
    )
    return {"id": str(order.id), "status": order.status}
