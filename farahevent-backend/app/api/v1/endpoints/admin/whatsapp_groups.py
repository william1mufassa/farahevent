"""CRUD groupes WhatsApp par événement + endpoint interne pour basculement auto."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, WhatsappGroupCategory
from app.models.whatsapp_group import WhatsappGroup
from app.schemas.event_admin import (
    WhatsappGroupCreate,
    WhatsappGroupOut,
    WhatsappGroupUpdate,
)
from app.services.audit_service import audit_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


def _to_out(g: WhatsappGroup) -> WhatsappGroupOut:
    return WhatsappGroupOut(
        id=str(g.id),
        event_id=str(g.event_id),
        category=g.category,
        invite_link=g.invite_link,
        max_capacity=g.max_capacity,
        current_count=g.current_count,
        sort_order=g.sort_order,
        is_active=g.is_active,
        is_full=g.is_full,
    )


@router.get("/events/{event_id}/whatsapp-groups", response_model=list[WhatsappGroupOut])
async def list_groups(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    parsed = _uuid(event_id)
    r = await db.execute(
        select(WhatsappGroup)
        .where(WhatsappGroup.event_id == parsed)
        .order_by(WhatsappGroup.category, WhatsappGroup.sort_order)
    )
    return [_to_out(g) for g in r.scalars().all()]


@router.post(
    "/events/{event_id}/whatsapp-groups",
    response_model=WhatsappGroupOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_group(
    event_id: str,
    data: WhatsappGroupCreate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    parsed = _uuid(event_id)
    g = WhatsappGroup(
        event_id=parsed,
        category=data.category.value,
        invite_link=data.invite_link,
        max_capacity=data.max_capacity,
        sort_order=data.sort_order,
    )
    db.add(g)
    await db.flush()
    await db.refresh(g)
    await audit_service.log(
        db, admin=admin, action="whatsapp_group.create",
        resource_type="whatsapp_group", resource_id=str(g.id),
        payload={"event_id": str(parsed), "category": g.category}, request=request,
    )
    return _to_out(g)


@router.patch("/whatsapp-groups/{group_id}", response_model=WhatsappGroupOut)
async def update_group(
    group_id: str,
    data: WhatsappGroupUpdate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    g = await _load(db, group_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(g, k, v)
    await audit_service.log(
        db, admin=admin, action="whatsapp_group.update",
        resource_type="whatsapp_group", resource_id=str(g.id),
        payload=changes, request=request,
    )
    return _to_out(g)


@router.delete("/whatsapp-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: str,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    g = await _load(db, group_id)
    await db.delete(g)
    await audit_service.log(
        db, admin=admin, action="whatsapp_group.delete",
        resource_type="whatsapp_group", resource_id=str(g.id),
        request=request,
    )


@router.post("/events/{event_id}/whatsapp-groups/next")
async def pick_next_group(
    event_id: str,
    category: WhatsappGroupCategory,
    _admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    """Retourne le prochain groupe actif non plein et incrémente son compteur.
    Utilisé par n8n / le service d'envoi WhatsApp à chaque nouvelle affectation."""
    parsed = _uuid(event_id)
    r = await db.execute(
        select(WhatsappGroup)
        .where(WhatsappGroup.event_id == parsed)
        .where(WhatsappGroup.category == category.value)
        .where(WhatsappGroup.is_active.is_(True))
        .order_by(WhatsappGroup.sort_order.asc())
        .with_for_update()
    )
    for g in r.scalars().all():
        if not g.is_full:
            g.current_count += 1
            return {
                "group_id": str(g.id),
                "invite_link": g.invite_link,
                "current_count": g.current_count,
                "max_capacity": g.max_capacity,
            }
    raise HTTPException(status_code=409, detail="Tous les groupes de cette catégorie sont pleins")


async def _load(db: AsyncSession, group_id: str) -> WhatsappGroup:
    parsed = _uuid(group_id)
    r = await db.execute(select(WhatsappGroup).where(WhatsappGroup.id == parsed))
    g = r.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    return g


def _uuid(v: str) -> uuid.UUID:
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="ID invalide")
