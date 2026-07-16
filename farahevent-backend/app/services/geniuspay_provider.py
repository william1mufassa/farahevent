"""Provider GeniusPay (https://pay.genius.ci) — paiement digital Côte d'Ivoire.

Implémente le contrat `PaymentProvider` déjà consommé par `orders.py`
(create_checkout) et `reconciliation_service.py` (get_status), plus
`verify_webhook_signature` pour l'endpoint webhook. Aucune modification des
appelants n'est nécessaire.

Doc : https://pay.genius.ci/doc
- Auth : deux headers séparés `X-API-Key` et `X-API-Secret` (pas de Bearer).
- POST {BASE_URL}/payments        → {data: {reference, checkout_url, status}}
- GET  {BASE_URL}/payments/{ref}  → statut de la transaction.
- Webhook : X-Webhook-Signature = HMAC-SHA256(timestamp + "." + raw_body, whsec).
"""
import hashlib
import hmac
import logging

import httpx

from app.core.config import settings
from app.services.payment_provider import CheckoutSession, PaymentProvider

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 15.0

# Statut GeniusPay → statut NORMALISÉ {pending, paid, failed} attendu par la
# réconciliation. `completed` = payé ; les statuts terminaux négatifs = failed.
_STATUS_MAP = {
    "pending": "pending",
    "processing": "pending",
    "completed": "paid",
    "failed": "failed",
    "cancelled": "failed",
    "expired": "failed",
    "refunded": "failed",
}


class GeniusPayError(Exception):
    """Erreur renvoyée par l'API GeniusPay (HTTP inattendu ou success=false)."""


class GeniusPayProvider(PaymentProvider):
    """Provider concret GeniusPay (mobile money + carte CI)."""

    @property
    def name(self) -> str:
        return "geniuspay"

    def _headers(self) -> dict:
        return {
            "X-API-Key": settings.GENIUSPAY_API_KEY,
            "X-API-Secret": settings.GENIUSPAY_SECRET_KEY,
            "Content-Type": "application/json",
        }

    async def create_checkout(
        self,
        *,
        order_id: str,
        amount: float,
        currency: str,
        description: str,
        success_url: str,
        cancel_url: str,
        webhook_url: str,
        payment_method: str | None = None,
    ) -> CheckoutSession:
        """Crée une transaction et renvoie l'URL de checkout hébergée GeniusPay.

        `payment_method` est volontairement omis par défaut => GeniusPay génère une page de
        checkout hébergée. Si spécifié (ex: "paystack" ou "card"), force ce moyen.
        """
        # Mapping de 'card' (notre identifiant front) vers 'paystack' (GeniusPay)
        gp_method = None
        if payment_method:
            gp_method = "paystack" if payment_method == "card" else payment_method

        payload = {
            "amount": int(amount),
            "currency": currency or "XOF",
            "description": (description or "")[:500],
            "success_url": success_url,
            "error_url": cancel_url,
            "metadata": {"order_id": str(order_id)},
        }
        if gp_method:
            payload["payment_method"] = gp_method

        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{settings.GENIUSPAY_BASE_URL}/payments",
                json=payload,
                headers=self._headers(),
            )
        body = response.json() if response.content else {}
        if response.status_code not in (200, 201) or not body.get("success"):
            logger.error(
                "GeniusPay create_checkout a échoué (status=%s, body=%s)",
                response.status_code,
                body,
            )
            raise GeniusPayError(
                f"GeniusPay a refusé la création du paiement (HTTP {response.status_code})"
            )
        data = body.get("data") or {}
        return CheckoutSession(
            checkout_id=data.get("reference"),
            checkout_url=data.get("checkout_url") or data.get("payment_url"),
            provider=self.name,
        )

    async def get_status(self, checkout_id: str) -> str:
        """Statut NORMALISÉ {pending, paid, failed} d'une transaction GeniusPay."""
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.get(
                f"{settings.GENIUSPAY_BASE_URL}/payments/{checkout_id}",
                headers=self._headers(),
            )
        if response.status_code == 404:
            # Transaction inconnue côté provider : ne pas la marquer failed à tort.
            return "pending"
        if response.status_code not in (200, 201):
            raise GeniusPayError(
                f"GeniusPay get_status HTTP {response.status_code} pour {checkout_id}"
            )
        data = (response.json() or {}).get("data") or {}
        raw = str(data.get("status", "pending")).lower()
        return _STATUS_MAP.get(raw, "pending")

    def verify_webhook_signature(
        self, *, timestamp: str, raw_body: bytes, signature: str
    ) -> bool:
        """Vérifie X-Webhook-Signature = HMAC-SHA256(timestamp + "." + raw_body, whsec).

        IMPORTANT : on signe le corps BRUT reçu (bytes), jamais un dict
        re-sérialisé — l'ordre/espacement des clés JSON changerait et casserait
        la signature.
        """
        secret = settings.GENIUSPAY_WEBHOOK_SECRET
        if not secret or not signature or not timestamp:
            return False
        signed = f"{timestamp}.".encode("utf-8") + raw_body
        expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)


geniuspay_provider = GeniusPayProvider()
