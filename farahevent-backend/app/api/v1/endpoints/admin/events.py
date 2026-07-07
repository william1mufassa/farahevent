"""CRUD événements côté admin — transitions statut, soft delete."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, EventStatus
from app.models.event import Event
from app.schemas.event_admin import (
    EventAdminOut,
    EventCreate,
    EventStatusUpdate,
    EventUpdate,
)
from app.services.audit_service import audit_service

router = APIRouter()

_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


_ALLOWED_TRANSITIONS = {
    EventStatus.DRAFT.value: {EventStatus.OPEN.value},
    EventStatus.OPEN.value: {EventStatus.LIVE.value, EventStatus.CLOSED.value},
    EventStatus.LIVE.value: {EventStatus.CLOSED.value},
    EventStatus.CLOSED.value: set(),
}


def _to_out(e: Event) -> EventAdminOut:
    return EventAdminOut(
        id=str(e.id),
        slug=e.slug,
        name=e.name,
        description=e.description,
        mode=e.mode,
        status=e.status,
        template=e.template,
        date=e.date,
        end_time=e.end_time,
        location=e.location,
        venue_city=e.venue_city,
        max_capacity=e.max_capacity,
        cover_image_url=e.cover_image_url,
        is_featured=e.is_featured,
        is_deleted=e.is_deleted,
        created_at=e.created_at,
    )


@router.get("/", response_model=list[EventAdminOut])
async def list_events_admin(
    include_deleted: bool = False,
    _admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event).order_by(Event.date.desc())
    if not include_deleted:
        stmt = stmt.where(Event.is_deleted.is_(False))
    result = await db.execute(stmt)
    return [_to_out(e) for e in result.scalars().all()]


@router.post("/", response_model=EventAdminOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(select(Event).where(Event.slug == data.slug))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug déjà utilisé")

    event = Event(
        slug=data.slug,
        name=data.name,
        description=data.description,
        mode=data.mode.value,
        template=data.template.value,
        date=data.date,
        end_time=data.end_time,
        location=data.location,
        venue_city=data.venue_city,
        max_capacity=data.max_capacity,
        cover_image_url=data.cover_image_url,
        status=EventStatus.DRAFT.value,
        created_by=admin.id,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)

    await audit_service.log(
        db, admin=admin, action="event.create",
        resource_type="event", resource_id=str(event.id),
        payload={"slug": event.slug}, request=request,
    )
    return _to_out(event)


@router.get("/{event_id}", response_model=EventAdminOut)
async def get_event_admin(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    return _to_out(await _load(db, event_id))


@router.patch("/{event_id}", response_model=EventAdminOut)
async def update_event(
    event_id: str,
    data: EventUpdate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    e = await _load(db, event_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k in ("mode", "template") and v is not None:
            setattr(e, k, v.value if hasattr(v, "value") else v)
        else:
            setattr(e, k, v)
    await audit_service.log(
        db, admin=admin, action="event.update",
        resource_type="event", resource_id=str(e.id),
        payload=changes, request=request,
    )
    return _to_out(e)


@router.patch("/{event_id}/status", response_model=EventAdminOut)
async def update_event_status(
    event_id: str,
    data: EventStatusUpdate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    e = await _load(db, event_id)
    target = data.status.value
    if target not in _ALLOWED_TRANSITIONS.get(e.status, set()):
        raise HTTPException(
            status_code=409,
            detail=f"Transition impossible : {e.status} → {target}",
        )
    old = e.status
    e.status = target
    await audit_service.log(
        db, admin=admin, action="event.status_change",
        resource_type="event", resource_id=str(e.id),
        payload={"from": old, "to": target}, request=request,
    )
    return _to_out(e)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_event(
    event_id: str,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    e = await _load(db, event_id)
    e.is_deleted = True
    await audit_service.log(
        db, admin=admin, action="event.delete",
        resource_type="event", resource_id=str(e.id),
        request=request,
    )


async def _load(db: AsyncSession, event_id: str) -> Event:
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")
    result = await db.execute(select(Event).where(Event.id == parsed))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return e
