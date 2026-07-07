"""CMS event_content — upsert bulk clé/valeur pour un événement."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.event_content import EventContent
from app.schemas.event_admin import EventContentOut, EventContentUpsert
from app.services.audit_service import audit_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


@router.get("/events/{event_id}/content", response_model=EventContentOut)
async def get_content(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    parsed = _uuid(event_id)
    result = await db.execute(
        select(EventContent).where(EventContent.event_id == parsed)
    )
    entries = {c.key: c.value for c in result.scalars().all()}
    return EventContentOut(entries=entries)


@router.put("/events/{event_id}/content", response_model=EventContentOut)
async def upsert_content(
    event_id: str,
    data: EventContentUpsert,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    parsed = _uuid(event_id)
    # Charger tous les content existants
    result = await db.execute(select(EventContent).where(EventContent.event_id == parsed))
    existing = {c.key: c for c in result.scalars().all()}

    changed_keys = []
    for key, value in data.entries.items():
        row = existing.get(key)
        if value is None:
            # Suppression
            if row:
                await db.delete(row)
                changed_keys.append(f"-{key}")
        elif row:
            if row.value != value:
                row.value = value
                changed_keys.append(f"~{key}")
        else:
            db.add(EventContent(event_id=parsed, key=key, value=value))
            changed_keys.append(f"+{key}")

    await db.flush()

    await audit_service.log(
        db, admin=admin, action="event_content.upsert",
        resource_type="event_content", resource_id=str(parsed),
        payload={"changes": changed_keys}, request=request,
    )

    # Retourne l'état final
    final = await db.execute(select(EventContent).where(EventContent.event_id == parsed))
    return EventContentOut(entries={c.key: c.value for c in final.scalars().all()})


def _uuid(v: str) -> uuid.UUID:
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")
