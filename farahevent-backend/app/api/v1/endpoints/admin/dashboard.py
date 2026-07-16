"""Dashboard admin — agrégations KPIs/séries + notifications (CONCEPTION_FRONTEND §10.2).

Contrats consommés par le frontend (getDashboardStats / getAdminNotifications) :
- GET /admin/stats?event_id=&period=7d|30d|all  → DashboardStats
- GET /admin/notifications                        → AdminNotification[]

Les KPIs et ventilations sont tout-temps (filtrés par événement si event_id) ;
seule la série de revenus dépend de la période. `live_viewers` reste null tant que
le streaming (v2) n'est pas branché.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_ws_ticket, require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, ManualPaymentStatus, OrderStatus
from app.models.formula import Formula
from app.models.manual_payment import ManualPayment
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket
from app.services.notification_hub import manual_payment_notification
from app.api.v1.endpoints.ws import live_hub

router = APIRouter()

_dashboard_roles = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.COMPTABLE)

_PAID = (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value)
_PERIOD_DAYS = {"7d": 7, "30d": 30, "all": 90}

# Statut commande → catégorie d'activité (front ActivityKind).
_ACTIVITY_KIND = {
    OrderStatus.PAID.value: "order_paid",
    OrderStatus.MANUAL_VALIDATED.value: "manual_validated",
    OrderStatus.MANUAL_PENDING.value: "manual_pending",
    OrderStatus.REJECTED.value: "manual_rejected",
    OrderStatus.REFUNDED.value: "refund",
}


def _parse_uuid(v: str | None) -> uuid.UUID | None:
    if not v:
        return None
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        return None


@router.get("/stats")
async def dashboard_stats(
    event_id: str | None = Query(None),
    period: str = Query("30d"),
    _admin: Admin = Depends(_dashboard_roles),
    db: AsyncSession = Depends(get_db),
):
    ev = _parse_uuid(event_id)
    now = datetime.now(timezone.utc)

    def paid(stmt):
        stmt = stmt.where(Order.status.in_(_PAID))
        return stmt.where(Order.event_id == ev) if ev else stmt

    # --- KPIs (tout-temps, filtrés par événement) ---
    tickets_sold = (await db.execute(paid(select(func.count(Order.id))))).scalar_one()
    revenue = (await db.execute(paid(select(func.coalesce(func.sum(Order.amount), 0))))).scalar_one()

    scans_stmt = select(func.count(Ticket.id)).where(Ticket.is_scanned.is_(True))
    if ev:
        scans_stmt = scans_stmt.where(Ticket.event_id == ev)
    scans = (await db.execute(scans_stmt)).scalar_one()

    pm_stmt = select(func.count(ManualPayment.id)).where(
        ManualPayment.status == ManualPaymentStatus.PENDING.value
    )
    if ev:
        pm_stmt = pm_stmt.join(Order, Order.id == ManualPayment.order_id).where(
            Order.event_id == ev
        )
    pending_manual = (await db.execute(pm_stmt)).scalar_one()

    # --- Viewers (Live) ---
    viewers = 0
    if ev:
        viewers = live_hub.get_viewer_count(str(ev))
    else:
        viewers = sum(len(conns) for conns in live_hub.active_connections.values())

    kpis = {
        "tickets_sold": int(tickets_sold or 0),
        "scans": int(scans or 0),
        "revenue": float(revenue or 0),
        "currency": "XOF",
        "live_viewers": viewers,
        "pending_manual": int(pending_manual or 0),
    }

    # --- Ventes par formule ---
    sbf = (
        await db.execute(
            paid(
                select(Formula.name, func.count(Order.id)).join(
                    Formula, Formula.id == Order.formula_id
                )
            ).group_by(Formula.name)
        )
    ).all()
    sales_by_formula = [{"formula": name, "count": int(c)} for name, c in sbf]

    # --- Ventes par pays ---
    sbc = (
        await db.execute(
            paid(
                select(Participant.country, func.count(Order.id)).join(
                    Participant, Participant.id == Order.participant_id
                )
            )
            .group_by(Participant.country)
            .order_by(func.count(Order.id).desc())
        )
    ).all()
    sales_by_country = [{"country": country, "count": int(c)} for country, c in sbc]

    # --- Série de revenus (derniers `days` jours, continue avec zéros) ---
    days = _PERIOD_DAYS.get(period, 30)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    day_col = func.date(Order.created_at)
    rows = (
        await db.execute(
            paid(
                select(day_col.label("d"), func.coalesce(func.sum(Order.amount), 0)).where(
                    Order.created_at >= start
                )
            ).group_by(day_col)
        )
    ).all()
    by_day = {str(d): float(r) for d, r in rows}
    revenue_series = [
        {"date": (start + timedelta(days=i)).date().isoformat(),
         "revenue": by_day.get((start + timedelta(days=i)).date().isoformat(), 0.0)}
        for i in range(days)
    ]

    # --- Activité récente (commandes) ---
    act_stmt = (
        select(Order, Participant.first_name, Participant.last_name, Formula.name)
        .join(Participant, Participant.id == Order.participant_id)
        .join(Formula, Formula.id == Order.formula_id)
        .where(Order.status.in_(list(_ACTIVITY_KIND.keys())))
        .order_by(Order.updated_at.desc())
        .limit(10)
    )
    if ev:
        act_stmt = act_stmt.where(Order.event_id == ev)
    activity = [
        {
            "id": str(order.id),
            "kind": _ACTIVITY_KIND.get(order.status, "order_paid"),
            "label": f"{fn} {ln} — {formula_name}",
            "amount": float(order.amount),
            "currency": order.currency,
            "at": order.updated_at.isoformat(),
        }
        for order, fn, ln, formula_name in (await db.execute(act_stmt)).all()
    ]

    return {
        "kpis": kpis,
        "sales_by_formula": sales_by_formula,
        "sales_by_country": sales_by_country,
        "revenue_series": revenue_series,
        "activity": activity,
    }


@router.get("/notifications")
async def admin_notifications(
    _admin: Admin = Depends(_dashboard_roles),
    db: AsyncSession = Depends(get_db),
):
    """File actionnable : paiements manuels en attente de validation (urgents)."""
    pend = (
        await db.execute(
            select(ManualPayment, Participant.first_name, Participant.last_name, Formula.name)
            .join(Order, Order.id == ManualPayment.order_id)
            .join(Participant, Participant.id == Order.participant_id)
            .join(Formula, Formula.id == Order.formula_id)
            .where(ManualPayment.status == ManualPaymentStatus.PENDING.value)
            .order_by(ManualPayment.created_at.desc())
            .limit(20)
        )
    ).all()

    return [
        manual_payment_notification(
            mp_id=mp.id,
            created_at=mp.created_at,
            operator=mp.operator,
            first_name=fn,
            last_name=ln,
            formula_name=formula_name,
        )
        for mp, fn, ln, formula_name in pend
    ]


@router.get("/ws-ticket")
async def ws_ticket(admin: Admin = Depends(_dashboard_roles)):
    """Émet un ticket court-terme pour ouvrir le WebSocket de notifications.

    Le JWT de session étant en cookie httpOnly (non transmis au handshake WS
    cross-origin), le front récupère ce ticket via le BFF authentifié puis le
    passe en query param à `/ws/admin/notifications`. Mêmes rôles que le seed."""
    ticket = create_ws_ticket(str(admin.id), admin.role)
    return {"ticket": ticket, "expires_in": settings.WS_TICKET_EXPIRE_SECONDS}
