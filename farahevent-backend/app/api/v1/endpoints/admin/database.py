"""Administration de la base — corbeille, restauration, hard-delete, reset.

Le module le plus destructeur de l'API. Trois principes le gouvernent :

1. **Tout est tracé.** C'était le SEUL des 13 modules de mutation admin sans
   `audit_service` : modifier une FAQ laissait une trace, effacer un événement et
   toute sa billetterie n'en laissait aucune. Un geste irréversible non tracé est
   ingérable le jour où quelqu'un demande « qui a fait ça ? ».
2. **Super admin seulement.** Un manager pilote un événement ; il n'a pas à
   pouvoir l'effacer définitivement.
3. **Jamais sur des ventes réelles.** Un événement qui a encaissé porte la preuve
   comptable et la liste des ayants droit. On refuse, on ne « demande pas
   confirmation » : l'API n'a pas d'utilisateur devant elle.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.admin.events import _to_out
from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, OrderStatus
from app.models.event import Event
from app.models.order import Order
from app.models.participant import Participant
from app.models.scan_log import ScanLog
from app.models.ticket import Ticket
from app.schemas.event_admin import EventAdminOut
from app.services.audit_service import audit_service

router = APIRouter(prefix="/database", tags=["Admin Database"])

# Lecture de la corbeille : manager admis (consultation non destructive).
_viewer = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)
# Écriture destructive : super admin UNIQUEMENT.
_destroyer = require_roles(AdminRole.SUPER_ADMIN)

# Une commande dans l'un de ces états représente de l'argent encaissé.
_SOLD = (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value)


class ResetCountersRequest(BaseModel):
    reset_orders: bool = False
    reset_participants: bool = False
    reset_scans: bool = False


def _parse(event_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")


async def _load(db: AsyncSession, event_id: str) -> Event:
    e = (
        await db.execute(select(Event).where(Event.id == _parse(event_id)))
    ).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return e


async def _sold_count(db: AsyncSession, event_id: uuid.UUID) -> int:
    return await db.scalar(
        select(func.count(Order.id)).where(
            Order.event_id == event_id, Order.status.in_(_SOLD)
        )
    )


@router.get("/deleted-events", response_model=list[EventAdminOut])
async def get_deleted_events(
    _admin: Admin = Depends(_viewer),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event).where(Event.is_deleted == True).order_by(Event.date.desc())  # noqa: E712
    result = await db.execute(stmt)
    return [_to_out(e) for e in result.scalars().all()]


@router.post("/events/{event_id}/restore", response_model=EventAdminOut)
async def restore_event(
    event_id: str,
    request: Request,
    admin: Admin = Depends(_viewer),
    db: AsyncSession = Depends(get_db),
):
    e = await _load(db, event_id)
    e.is_deleted = False
    await audit_service.log(
        db, admin=admin, action="event.restore",
        resource_type="event", resource_id=str(e.id),
        payload={"name": e.name, "slug": e.slug}, request=request,
    )
    return _to_out(e)


@router.delete("/events/{event_id}/hard-delete", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_event(
    event_id: str,
    request: Request,
    admin: Admin = Depends(_destroyer),
    db: AsyncSession = Depends(get_db),
):
    """Suppression DÉFINITIVE d'un événement et de tout ce qui en dépend."""
    e = await _load(db, event_id)

    sold = await _sold_count(db, e.id)
    if sold:
        raise HTTPException(
            status_code=409,
            detail=(
                f"{sold} commande(s) payée(s) sur cet événement — suppression refusée. "
                "Ce sont la preuve comptable et la liste des ayants droit."
            ),
        )

    # Journalisé AVANT le delete : après, l'objet est expiré et relire e.name
    # déclencherait un lazy-load hors greenlet (même piège que la réconciliation).
    await audit_service.log(
        db, admin=admin, action="event.hard_delete",
        resource_type="event", resource_id=str(e.id),
        payload={"name": e.name, "slug": e.slug, "status": e.status}, request=request,
    )
    # `await db.delete` (et non un DELETE en masse) : les relations d'Event portent
    # cascade="all, delete-orphan", l'ORM purge donc formules, contenus, config…
    # Les FK vers events sont en NO ACTION côté base : sans cette cascade ORM, la
    # suppression échouerait sur contrainte.
    await db.delete(e)
    return None


@router.post("/events/{event_id}/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_event_data(
    event_id: str,
    payload: ResetCountersRequest,
    request: Request,
    admin: Admin = Depends(_destroyer),
    db: AsyncSession = Depends(get_db),
):
    """Purge les données de test d'un événement (commandes, participants, scans)."""
    e = await _load(db, event_id)

    if payload.reset_orders or payload.reset_participants:
        sold = await _sold_count(db, e.id)
        if sold:
            raise HTTPException(
                status_code=409,
                detail=f"{sold} commande(s) payée(s) sur cet événement — purge refusée.",
            )

    # `orders.participant_id` est en NO ACTION et Participant n'a AUCUNE cascade
    # ORM : purger les participants sans purger leurs commandes laisserait des
    # commandes orphelines — en réalité une violation de contrainte. On l'interdit
    # explicitement plutôt que de laisser la base répondre par une 500.
    if payload.reset_participants and not payload.reset_orders:
        raise HTTPException(
            status_code=409,
            detail="reset_participants exige reset_orders (les commandes les référencent).",
        )

    await audit_service.log(
        db, admin=admin, action="event.reset",
        resource_type="event", resource_id=str(e.id),
        payload={
            "name": e.name,
            "reset_orders": payload.reset_orders,
            "reset_participants": payload.reset_participants,
            "reset_scans": payload.reset_scans,
        },
        request=request,
    )

    # Les participants visés sont capturés AVANT la purge des commandes : c'est
    # via `orders` qu'on sait lesquels appartiennent à cet événement.
    participant_ids: list[uuid.UUID] = []
    if payload.reset_participants:
        participant_ids = list(
            (
                await db.execute(
                    select(Order.participant_id).where(Order.event_id == e.id)
                )
            ).scalars().all()
        )

    # Ordre imposé par les FK : enfants d'abord, parents ensuite.
    if payload.reset_scans:
        await db.execute(delete(ScanLog).where(ScanLog.event_id == e.id))

    if payload.reset_orders:
        # Les scan_logs référencent les tickets : les purger d'abord, sinon la
        # suppression des tickets viole la contrainte.
        await db.execute(delete(ScanLog).where(ScanLog.event_id == e.id))
        await db.execute(delete(Ticket).where(Ticket.event_id == e.id))
        await db.execute(delete(Order).where(Order.event_id == e.id))

    if participant_ids:
        # Un participant qui a aussi commandé sur un AUTRE événement doit survivre :
        # sinon on casserait les commandes de cet autre événement.
        still_referenced = select(Order.participant_id).where(
            Order.participant_id.in_(participant_ids)
        )
        await db.execute(
            delete(Participant).where(
                Participant.id.in_(participant_ids),
                ~Participant.id.in_(still_referenced),
            )
        )

    return None
