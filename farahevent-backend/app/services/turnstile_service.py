"""Vérification serveur du CAPTCHA Cloudflare Turnstile (audit §C.3).

Le frontend affiche le widget et envoie un jeton avec la commande ; ce service
valide ce jeton auprès de Cloudflare avant d'accepter la commande. Si aucune clé
n'est configurée (dev), la vérification est un no-op (laisse passer) — cohérent
avec le frontend qui masque le champ quand la site-key est vide.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class TurnstileService:
    def __init__(self):
        self.secret = settings.TURNSTILE_SECRET_KEY
        self._client: httpx.AsyncClient | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.secret)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=10)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    async def verify(self, token: str | None, remote_ip: str | None = None) -> bool:
        """True si le jeton est valide (ou si la vérif est désactivée en dev)."""
        if not self.enabled:
            return True
        if not token:
            return False
        payload = {"secret": self.secret, "response": token}
        if remote_ip:
            payload["remoteip"] = remote_ip
        try:
            resp = await self._get_client().post(_VERIFY_URL, data=payload)
            resp.raise_for_status()
            return bool(resp.json().get("success"))
        except Exception:
            # Panne réseau vers Cloudflare → on refuse (fail-closed) et on trace.
            logger.exception("Échec de la vérification Turnstile")
            return False


turnstile_service = TurnstileService()
