"""Invalidation ISR du frontend Next après une modif de contenu (suivi ISR).

Le frontend expose POST /api/revalidate { tag } (header X-Revalidate-Secret).
Ce service l'appelle après une sauvegarde CMS pour que la landing se mette à jour
immédiatement au lieu d'attendre l'expiration du cache ISR (60 s).

Fire-and-forget : un échec de revalidation NE casse PAS la sauvegarde admin (on loggue).
"""
import logging
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.event import Event

logger = logging.getLogger(__name__)


class RevalidateService:
    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    async def revalidate_event(self, slug: str | None) -> None:
        """Invalide le tag `event:<slug>` côté frontend. No-op si non configuré."""
        if not settings.REVALIDATE_SECRET or not slug:
            return
        url = f"{settings.frontend_internal_url.rstrip('/')}/api/revalidate"
        try:
            resp = await self._get_client().post(
                url,
                json={"tag": f"event:{slug}"},
                headers={"X-Revalidate-Secret": settings.REVALIDATE_SECRET},
            )
            resp.raise_for_status()
        except Exception:
            logger.warning("Revalidation ISR échouée pour event:%s", slug, exc_info=True)

    async def revalidate_event_by_id(self, db: AsyncSession, event_id: uuid.UUID) -> None:
        """Comme `revalidate_event` mais résout le slug depuis l'event_id.

        Pour les endpoints qui n'ont sous la main qu'un event_id (ou un objet
        enfant : formule, FAQ) et pas le slug. No-op si non configuré (évite une
        requête inutile). L'autoflush persiste d'abord les mutations en attente.
        """
        if not settings.REVALIDATE_SECRET:
            return
        slug = await db.scalar(select(Event.slug).where(Event.id == event_id))
        await self.revalidate_event(slug)


revalidate_service = RevalidateService()
