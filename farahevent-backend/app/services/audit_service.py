"""Service d'audit — helper appelé par les endpoints admin qui mutent l'état."""
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import Admin
from app.models.audit_log import AuditLog


def client_ip(request: Request | None) -> str | None:
    """IP réelle de l'appelant, dans l'ordre de confiance décroissant.

    1. `X-Real-IP` — nginx l'ÉCRASE avec `$remote_addr` (le pair TCP réel) :
       c'est le seul header qu'un client ne peut pas forger.
    2. `X-Forwarded-For` — nginx y AJOUTE (`$proxy_add_x_forwarded_for`), donc la
       PREMIÈRE entrée vient du client et est forgeable ; la DERNIÈRE est celle
       qu'nginx a ajoutée. On prend donc la dernière, jamais la première.
       (L'ancien code prenait la chaîne BRUTE : « evil, 1.2.3.4 » finissait
       telle quelle dans l'audit trail — falsifiable, et illisible.)
    3. `request.client.host` — dernier recours. Derrière un proxy, c'est l'IP du
       proxy, pas celle de l'admin : sans les headers ci-dessus, toutes les
       actions portaient la même IP inutile.
    """
    if request is None:
        return None

    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()[:45]  # borne INET/IPv6

    xff = request.headers.get("x-forwarded-for")
    if xff:
        hops = [h.strip() for h in xff.split(",") if h.strip()]
        if hops:
            return hops[-1][:45]

    return request.client.host if request.client else None


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
        ip = client_ip(request)
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
