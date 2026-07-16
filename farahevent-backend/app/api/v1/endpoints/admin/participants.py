"""Liste des participants admin (CONCEPTION_FRONTEND §10.5).

Une ligne = une commande d'un participant. Recherche + filtres (formule / pays /
statut) + tri + pagination + facettes, le tout server-side.

Contrat consommé par le frontend (getParticipants) :
- GET /admin/participants?eventId=&search=&formula=&country=&status=&page=&pageSize=&sort=&dir=
  → ParticipantsResult { rows: ParticipantRow[], total, facets: { formulas, countries } }
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, OrderStatus
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket

router = APIRouter()

_roles = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)

# OrderStatus → statut de paiement affiché côté front (ParticipantPaymentStatus).
_STATUS_TO_FRONT = {
    OrderStatus.PAID.value: "paid",
    OrderStatus.MANUAL_VALIDATED.value: "paid",
    OrderStatus.PENDING.value: "pending",
    OrderStatus.MANUAL_PENDING.value: "pending",
    OrderStatus.FAILED.value: "failed",
    OrderStatus.REJECTED.value: "failed",
    OrderStatus.REFUNDED.value: "refunded",
}
# Filtre front → ensemble de statuts BDD.
_STATUS_FILTER = {
    "paid": [OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value],
    "pending": [OrderStatus.PENDING.value, OrderStatus.MANUAL_PENDING.value],
    "failed": [OrderStatus.FAILED.value, OrderStatus.REJECTED.value],
    "refunded": [OrderStatus.REFUNDED.value],
}
_SORT_COLS = {
    "created_at": Order.created_at,
    "amount": Order.amount,
    "first_name": Participant.first_name,
    "last_name": Participant.last_name,
    "email": Participant.email,
    "country": Participant.country,
    "formula": Formula.name,
    "status": Order.status,
}


def _parse_uuid(v: str | None) -> uuid.UUID | None:
    if not v:
        return None
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        return None


@router.get("/participants")
async def list_participants(
    eventId: str | None = Query(None),
    search: str | None = Query(None),
    formula: str | None = Query(None),
    country: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at"),
    dir: str = Query("desc"),
    _admin: Admin = Depends(_roles),
    db: AsyncSession = Depends(get_db),
):
    ev = _parse_uuid(eventId)

    # Conditions de filtrage communes (appliquées à la liste ET au total).
    conds = []
    if ev:
        conds.append(Order.event_id == ev)
    if formula:
        conds.append(Formula.name == formula)
    if country:
        conds.append(Participant.country == country)
    if status and status in _STATUS_FILTER:
        conds.append(Order.status.in_(_STATUS_FILTER[status]))
    if search:
        like = f"%{search.strip()}%"
        conds.append(
            or_(
                Participant.first_name.ilike(like),
                Participant.last_name.ilike(like),
                Participant.email.ilike(like),
                cast(Order.id, String).ilike(like),
            )
        )

    # `scanned` calculé en colonne corrélée (pas de N+1).
    scanned_col = (
        exists().where((Ticket.order_id == Order.id) & (Ticket.is_scanned.is_(True))).label("scanned")
    )
    email_status_col = (
        select(func.max(Ticket.email_delivery_status)).where(Ticket.order_id == Order.id).scalar_subquery().label("email_status")
    )
    wa_status_col = (
        select(func.max(Ticket.whatsapp_delivery_status)).where(Ticket.order_id == Order.id).scalar_subquery().label("wa_status")
    )

    joined = (
        select(Order, Participant, Formula, scanned_col, email_status_col, wa_status_col)
        .join(Participant, Participant.id == Order.participant_id)
        .join(Formula, Formula.id == Order.formula_id)
    )
    count_stmt = (
        select(func.count())
        .select_from(Order)
        .join(Participant, Participant.id == Order.participant_id)
        .join(Formula, Formula.id == Order.formula_id)
    )
    for c in conds:
        joined = joined.where(c)
        count_stmt = count_stmt.where(c)

    total = (await db.execute(count_stmt)).scalar_one()

    col = _SORT_COLS.get(sort, Order.created_at)
    joined = joined.order_by(col.asc() if dir == "asc" else col.desc())
    joined = joined.limit(pageSize).offset((page - 1) * pageSize)

    rows = []
    for order, participant, formula_obj, is_scanned, email_status, wa_status in (await db.execute(joined)).all():
        payment_mode = (order.metadata_ or {}).get("payment_mode") or (
            "manual" if order.payment_provider == "manual" else "digital"
        )
        rows.append(
            {
                "id": str(order.id),
                "order_ref": f"ORD-{str(order.id)[:8].upper()}",
                "first_name": participant.first_name,
                "last_name": participant.last_name,
                "email": participant.email,
                "whatsapp": participant.whatsapp,
                "country": participant.country,
                "city": participant.city,
                "formula": formula_obj.name,
                "channel": "online" if formula_obj.channel == "online" else "presentiel",
                "payment_mode": payment_mode,
                "status": _STATUS_TO_FRONT.get(order.status, "pending"),
                "amount": float(order.amount),
                "currency": order.currency,
                "created_at": order.created_at.isoformat(),
                "scanned": bool(is_scanned),
                "email_delivery_status": email_status or "pending",
                "whatsapp_delivery_status": wa_status or "pending",
            }
        )

    # Facettes (valeurs distinctes dans le périmètre événement, indépendantes des filtres).
    f_stmt = select(func.distinct(Formula.name)).join(Order, Order.formula_id == Formula.id)
    c_stmt = select(func.distinct(Participant.country)).join(
        Order, Order.participant_id == Participant.id
    )
    if ev:
        f_stmt = f_stmt.where(Order.event_id == ev)
        c_stmt = c_stmt.where(Order.event_id == ev)
    formulas = sorted(x for x in (await db.execute(f_stmt)).scalars().all() if x)
    countries = sorted(x for x in (await db.execute(c_stmt)).scalars().all() if x)

    return {
        "rows": rows,
        "total": int(total or 0),
        "facets": {"formulas": formulas, "countries": countries},
    }
