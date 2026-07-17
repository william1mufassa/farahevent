"""Traitement des paiements manuels par les admins (Manager + Super Admin + Comptable).

- validate → order.MANUAL_VALIDATED + génération des billets (via ticket_service)
- reject   → order.REJECTED avec motif
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, ManualPaymentStatus, OrderStatus
from app.models.manual_payment import ManualPayment
from app.models.order import Order
from app.schemas.manual_payment import (
    ManualPaymentOut,
    ManualPaymentRejectRequest,
    ManualPaymentValidateResponse,
)
from app.services.audit_service import audit_service
from app.services.ticket_service import StockExceededError, ticket_service

router = APIRouter()

_validator_roles = require_roles(
    AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.COMPTABLE
)
_viewer_roles = require_roles(
    AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.COMPTABLE
)


# Chargement eager des relations en un nombre constant de requêtes (order +
# participant/event/formula) — supprime le N+1 de la liste (audit §D.1).
_EAGER = (
    selectinload(ManualPayment.order).options(
        selectinload(Order.participant),
        selectinload(Order.event),
        selectinload(Order.formula),
    ),
)


def _to_out(mp: ManualPayment) -> ManualPaymentOut:
    """Construit la réponse depuis les relations déjà chargées — aucune requête."""
    order = mp.order
    if not order:
        raise HTTPException(status_code=500, detail="Order manquant pour ce manual_payment")
    participant = order.participant
    event = order.event
    formula = order.formula

    return ManualPaymentOut(
        id=str(mp.id),
        order_id=str(mp.order_id),
        operator=mp.operator,
        sender_name=mp.sender_name,
        sender_country=mp.sender_country,
        # Chemin de la route admin authentifiée (et non l'URL publique) — audit §C.2.
        receipt_image_url=f"/admin/manual-payments/{mp.id}/receipt",
        status=mp.status,
        rejection_reason=mp.rejection_reason,
        validated_by=str(mp.validated_by) if mp.validated_by else None,
        validated_at=mp.validated_at,
        created_at=mp.created_at,
        order={
            "id": str(order.id),
            "status": order.status,
            "amount": float(order.amount),
            "currency": order.currency,
        },
        participant={
            "id": str(participant.id) if participant else None,
            "first_name": participant.first_name if participant else None,
            "last_name": participant.last_name if participant else None,
            "email": participant.email if participant else None,
            "whatsapp": participant.whatsapp if participant else None,
            "country": participant.country if participant else None,
        },
        event={
            "id": str(event.id) if event else None,
            "name": event.name if event else None,
            "slug": event.slug if event else None,
        },
        formula={
            "id": str(formula.id) if formula else None,
            "name": formula.name if formula else None,
            "price": float(formula.price) if formula else None,
        },
    )


@router.get("/", response_model=list[ManualPaymentOut])
async def list_manual_payments(
    status_filter: str | None = Query(None, alias="status"),
    _admin: Admin = Depends(_viewer_roles),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ManualPayment).options(*_EAGER).order_by(ManualPayment.created_at.desc())
    if status_filter:
        allowed = {s.value for s in ManualPaymentStatus}
        if status_filter not in allowed:
            raise HTTPException(status_code=400, detail=f"status invalide, autorisés : {sorted(allowed)}")
        stmt = stmt.where(ManualPayment.status == status_filter)
    result = await db.execute(stmt)
    return [_to_out(mp) for mp in result.scalars().all()]


@router.get("/{mp_id}", response_model=ManualPaymentOut)
async def get_manual_payment(
    mp_id: str, _admin: Admin = Depends(_viewer_roles), db: AsyncSession = Depends(get_db)
):
    mp = await _load(db, mp_id)
    return _to_out(mp)


@router.get("/{mp_id}/receipt")
async def get_receipt(
    mp_id: str, _admin: Admin = Depends(_viewer_roles), db: AsyncSession = Depends(get_db)
):
    """Sert l'image du reçu — réservé aux rôles autorisés (audit §C.2). Remplace
    l'ancien accès statique public à /uploads/receipts/."""
    mp = await _load(db, mp_id)
    base = Path(settings.UPLOAD_DIR).resolve()
    key = mp.receipt_image_url.lstrip("/")
    if key.startswith("uploads/"):  # tolère d'anciennes valeurs préfixées
        key = key[len("uploads/") :]
    target = (base / key).resolve()
    # Garde anti-traversée de chemin : le fichier doit rester sous UPLOAD_DIR.
    if not target.is_relative_to(base) or not target.is_file():
        raise HTTPException(status_code=404, detail="Reçu introuvable")
    return FileResponse(target)


@router.post("/{mp_id}/validate", response_model=ManualPaymentValidateResponse)
async def validate_manual_payment(
    mp_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    admin: Admin = Depends(require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    """(Dashboard) Valide un paiement manuel et émet les billets (si stock dispo)."""
    mp = await _load(db, mp_id)
    if mp.status != ManualPaymentStatus.PENDING.value:
        raise HTTPException(status_code=409, detail=f"Déjà traité (statut {mp.status})")

    order = (await db.execute(select(Order).where(Order.id == mp.order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=500, detail="Order manquant")

    mp.status = ManualPaymentStatus.VALIDATED.value
    mp.validated_by = admin.id
    mp.validated_at = datetime.now(timezone.utc)

    order.status = OrderStatus.MANUAL_VALIDATED.value
    await db.flush()

    try:
        tickets = await ticket_service.generate_for_order(order, db)
    except StockExceededError as e:
        # Formule épuisée au moment d'émettre : toute la transaction est annulée
        # par get_db (mp + order reviennent à leur état antérieur MANUAL_PENDING).
        raise HTTPException(status_code=409, detail=str(e))

    # Envoi asynchrone des billets
    # Livraison programmée par `generate_for_order` dans cette transaction (outbox,
    # T3.10) : la boucle de fond s'en charge, avec retry.

    await audit_service.log(
        db, admin=admin, action="manual_payment.validate",
        resource_type="manual_payment", resource_id=str(mp.id),
        payload={"order_id": str(order.id), "tickets": len(tickets)},
        request=request,
    )
    return ManualPaymentValidateResponse(
        order_id=str(order.id),
        status=order.status,
        tickets_generated=len(tickets),
    )


@router.post("/{mp_id}/reject")
async def reject_manual_payment(
    mp_id: str,
    data: ManualPaymentRejectRequest,
    request: Request,
    admin: Admin = Depends(_validator_roles),
    db: AsyncSession = Depends(get_db),
):
    mp = await _load(db, mp_id)
    if mp.status != ManualPaymentStatus.PENDING.value:
        raise HTTPException(status_code=409, detail=f"Déjà traité (statut {mp.status})")

    order = (await db.execute(select(Order).where(Order.id == mp.order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=500, detail="Order manquant")

    mp.status = ManualPaymentStatus.REJECTED.value
    mp.rejection_reason = data.reason
    mp.validated_by = admin.id
    mp.validated_at = datetime.now(timezone.utc)

    order.status = OrderStatus.REJECTED.value

    await audit_service.log(
        db, admin=admin, action="manual_payment.reject",
        resource_type="manual_payment", resource_id=str(mp.id),
        payload={"order_id": str(order.id), "reason": data.reason},
        request=request,
    )
    return {"order_id": str(order.id), "status": order.status, "reason": data.reason}


async def _load(db: AsyncSession, mp_id: str) -> ManualPayment:
    try:
        parsed = uuid.UUID(mp_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="ID invalide")
    r = await db.execute(
        select(ManualPayment).options(*_EAGER).where(ManualPayment.id == parsed)
    )
    mp = r.scalar_one_or_none()
    if not mp:
        raise HTTPException(status_code=404, detail="Paiement manuel non trouvé")
    return mp
