"""Service d'audit — helper appelé par les endpoints admin qui mutent l'état."""
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import Admin
from app.models.audit_log import AuditLog


class AuditService:
    async def log(
        self,
        db: AsyncSession,
        *,
        admin: Admin | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        payload: dict[str, Any] | None = None,
        request: Request | None = None,
    ) -> None:
        ip = None
        if request is not None:
            ip = (
                request.headers.get("x-forwarded-for", request.client.host if request.client else None)
                if request.client
                else None
            )
        db.add(
            AuditLog(
                admin_id=admin.id if admin else None,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id is not None else None,
                payload=payload,
                ip_address=ip,
            )
        )
        await db.flush()


audit_service = AuditService()
