"""CRUD email_automations — n8n consomme cette table."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.email_automation import EmailAutomation
from app.models.enums import AdminRole
from app.schemas.event_admin import (
    EmailAutomationCreate,
    EmailAutomationOut,
    EmailAutomationUpdate,
)
from app.services.audit_service import audit_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


def _to_out(a: EmailAutomation) -> EmailAutomationOut:
    return EmailAutomationOut(
        id=str(a.id), event_id=str(a.event_id),
        trigger_type=a.trigger_type, channel=a.channel,
        template_id=a.template_id,
        relative_offset_minutes=a.relative_offset_minutes,
        is_active=a.is_active,
    )


@router.get("/events/{event_id}/email-automations", response_model=list[EmailAutomationOut])
async def list_automations(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    parsed = _uuid(event_id)
    r = await db.execute(
        select(EmailAutomation)
        .where(EmailAutomation.event_id == parsed)
        .order_by(EmailAutomation.relative_offset_minutes.nulls_first())
    )
    return [_to_out(a) for a in r.scalars().all()]


@router.post(
    "/events/{event_id}/email-automations",
    response_model=EmailAutomationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_automation(
    event_id: str, data: EmailAutomationCreate, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    parsed = _uuid(event_id)
    a = EmailAutomation(
        event_id=parsed,
        trigger_type=data.trigger_type.value,
        channel=data.channel.value,
        template_id=data.template_id,
        relative_offset_minutes=data.relative_offset_minutes,
    )
    db.add(a)
    await db.flush()
    await db.refresh(a)
    await audit_service.log(
        db, admin=admin, action="email_automation.create",
        resource_type="email_automation", resource_id=str(a.id),
        payload={"event_id": str(parsed), "trigger": a.trigger_type}, request=request,
    )
    return _to_out(a)


@router.patch("/email-automations/{automation_id}", response_model=EmailAutomationOut)
async def update_automation(
    automation_id: str, data: EmailAutomationUpdate, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    a = await _load(db, automation_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k == "channel" and v is not None:
            a.channel = v.value
        else:
            setattr(a, k, v)
    await audit_service.log(
        db, admin=admin, action="email_automation.update",
        resource_type="email_automation", resource_id=str(a.id),
        payload=changes, request=request,
    )
    return _to_out(a)


@router.delete("/email-automations/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: str, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    a = await _load(db, automation_id)
    await db.delete(a)
    await audit_service.log(
        db, admin=admin, action="email_automation.delete",
        resource_type="email_automation", resource_id=str(a.id), request=request,
    )


async def _load(db: AsyncSession, automation_id: str) -> EmailAutomation:
    parsed = _uuid(automation_id)
    r = await db.execute(select(EmailAutomation).where(EmailAutomation.id == parsed))
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Automation non trouvée")
    return a


def _uuid(v: str) -> uuid.UUID:
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="ID invalide")
