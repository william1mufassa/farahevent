"""Invalidation ISR du frontend Next après une modif de contenu (suivi ISR).

Le frontend expose POST /api/revalidate { tag } (header X-Revalidate-Secret).
Ce service l'appelle après une sauvegarde CMS pour que la landing se mette à jour
immédiatement au lieu d'attendre l'expiration du cache ISR (60 s).

Fire-and-forget : un échec de revalidation NE casse PAS la sauvegarde admin (on loggue).
"""
import logging

import httpx

from app.core.config import settings

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


revalidate_service = RevalidateService()
