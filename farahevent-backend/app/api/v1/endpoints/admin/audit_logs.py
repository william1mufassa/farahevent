"""Consultation des logs d'audit — Super Admin uniquement."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.audit_log import AuditLog
from app.models.enums import AdminRole

router = APIRouter()
_super = require_roles(AdminRole.SUPER_ADMIN)


@router.get("/")
async def list_audit_logs(
    admin_id: str | None = Query(None),
    action_prefix: str | None = Query(None, description="Prefix filter, ex: 'event.'"),
    resource_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _admin: Admin = Depends(_super),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

    if admin_id:
        try:
            stmt = stmt.where(AuditLog.admin_id == uuid.UUID(admin_id))
        except (ValueError, TypeError):
            pass
    if action_prefix:
        stmt = stmt.where(AuditLog.action.like(f"{action_prefix}%"))
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Hydratation email admin (batch)
    admin_ids = {log.admin_id for log in logs if log.admin_id}
    admins_map: dict[uuid.UUID, str] = {}
    if admin_ids:
        r = await db.execute(select(Admin.id, Admin.email).where(Admin.id.in_(admin_ids)))
        admins_map = {row[0]: row[1] for row in r.all()}

    return [
        {
            "id": str(log.id),
            "admin_id": str(log.admin_id) if log.admin_id else None,
            "admin_email": admins_map.get(log.admin_id) if log.admin_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "payload": log.payload,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
