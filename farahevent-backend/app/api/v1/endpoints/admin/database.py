from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.event import Event
from app.models.order import Order
from app.models.ticket import Ticket
from app.models.participant import Participant
from app.models.scan_log import ScanLog
from app.schemas.event_admin import EventAdminOut
from app.api.v1.endpoints.admin.events import _to_out

router = APIRouter(prefix="/database", tags=["Admin Database"])

_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)

class ResetCountersRequest(BaseModel):
    reset_orders: bool = False
    reset_participants: bool = False
    reset_scans: bool = False


@router.get("/deleted-events", response_model=list[EventAdminOut])
async def get_deleted_events(
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event).where(Event.is_deleted == True).order_by(Event.date.desc())
    result = await db.execute(stmt)
    return [_to_out(e) for e in result.scalars().all()]


@router.post("/events/{event_id}/restore", response_model=EventAdminOut)
async def restore_event(
    event_id: str,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")

    result = await db.execute(select(Event).where(Event.id == parsed))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    e.is_deleted = False
    return _to_out(e)


@router.delete("/events/{event_id}/hard-delete", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_event(
    event_id: str,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")

    result = await db.execute(select(Event).where(Event.id == parsed))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    await db.delete(e)
    return None


@router.post("/events/{event_id}/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_event_data(
    event_id: str,
    payload: ResetCountersRequest,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")

    if payload.reset_participants:
        # On le fait AVANT la suppression des commandes
        subq = select(Order.participant_id).where(Order.event_id == parsed)
        await db.execute(delete(Participant).where(Participant.id.in_(subq)))

    if payload.reset_orders:
        await db.execute(delete(Ticket).where(Ticket.event_id == parsed))
        await db.execute(delete(Order).where(Order.event_id == parsed))
    
    if payload.reset_scans:
        await db.execute(delete(ScanLog).where(ScanLog.event_id == parsed))
        
    return None
