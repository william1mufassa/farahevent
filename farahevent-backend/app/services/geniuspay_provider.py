"""Provider GeniusPay — paiement digital Côte d'Ivoire (mobile money + carte).

Doc : https://pay.genius.ci/doc — contrat vérifié le 2026-07-16.
- Auth : deux headers séparés `X-API-Key` et `X-API-Secret` (pas de Bearer).
- POST {API_URL}/payments        → {success, data:{reference, payment_url, fees, …}}
- GET  {API_URL}/payments/{ref}  → statut de la transaction.
- Webhook : X-Webhook-Signature = HMAC-SHA256(timestamp + "." + raw_body, whsec).

Implémente le contrat `PaymentProvider` consommé par `orders.py` (create_checkout),
`reconciliation_service.py` (get_status) et `webhooks.py` (verify_webhook_signature).
"""
import hashlib
import hmac
import logging

import httpx

from app.core.config import settings
from app.services.payment_provider import CheckoutSession, CustomerInfo, PaymentProvider

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 15.0

# Montant minimum accepté par GeniusPay en XOF. Validé côté client : sinon l'API
# rejette et l'acheteur reçoit une erreur opaque au pire moment du tunnel.
_MIN_AMOUNT_XOF = 200

# Statut GeniusPay → statut NORMALISÉ {pending, paid, failed} attendu par la
# réconciliation. `completed` = payé ; les statuts terminaux négatifs = failed.
# Sur-ensemble volontaire de la doc (cancelled/refunded) : un statut inconnu
# retombe sur "pending", jamais sur "paid".
_STATUS_MAP = {
    "pending": "pending",
    "processing": "pending",
    "completed": "paid",
    "failed": "failed",
    "cancelled": "failed",
    "expired": "failed",
    "refunded": "failed",
}

# Valeurs de `payment_method` acceptées par GeniusPay (doc). Toute autre valeur est
# rejetée par l'API — on valide donc AVANT l'appel plutôt que de le découvrir au
# premier paiement réel.
_GP_METHODS = {"wave", "pawapay", "paystack", "orange_money", "mtn_money", "card"}

# Nos identifiants front → identifiants GeniusPay.
# ⚠ `mobile_money` (envoyé par PaymentPicker) N'EXISTE PAS chez GeniusPay : on le
# route vers `pawapay`, qui choisit automatiquement l'opérateur (Orange/MTN/Moov)
# à partir du numéro — d'où l'envoi de customer.phone/country. La doc est explicite :
# « Le numéro de téléphone suffit ».
_METHOD_MAP = {
    "mobile_money": "pawapay",
    "card": "card",
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

    @staticmethod
    def _resolve_method(payment_method: str | None) -> str | None:
        """Traduit notre identifiant vers celui de GeniusPay, ou None.

        None => on omet le champ et GeniusPay affiche sa page de checkout hébergée
        (tous moyens). C'est le repli sûr : mieux vaut un choix de plus pour
        l'acheteur qu'une requête rejetée.
        """
        if not payment_method:
            return None
        mapped = _METHOD_MAP.get(payment_method, payment_method)
        if mapped not in _GP_METHODS:
            logger.warning(
                "GeniusPay: payment_method '%s' inconnu (→ '%s') — champ omis, "
                "checkout hébergé utilisé à la place.",
                payment_method,
                mapped,
            )
            return None
        return mapped

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
        customer: CustomerInfo | None = None,
    ) -> CheckoutSession:
        """Crée une transaction et renvoie l'URL de checkout hébergée GeniusPay.

        `webhook_url` est ignoré : l'endpoint de notification se configure dans le
        tableau de bord GeniusPay, l'API ne l'accepte pas en paramètre. Le lien avec
        la commande passe par `metadata.order_id`, réémis tel quel dans le webhook.
        """
        cur = (currency or "XOF").upper()
        if cur == "XOF" and int(amount) < _MIN_AMOUNT_XOF:
            raise GeniusPayError(
                f"Montant {int(amount)} XOF sous le minimum GeniusPay ({_MIN_AMOUNT_XOF} XOF)"
            )

        payload: dict = {
            "amount": int(amount),
            "currency": cur,
            "description": (description or "")[:500],
            "success_url": success_url,
            "error_url": cancel_url,
            "metadata": {"order_id": str(order_id)},
        }

        gp_method = self._resolve_method(payment_method)
        if gp_method:
            payload["payment_method"] = gp_method

        if customer:
            cust = {
                k: v
                for k, v in (
                    ("name", customer.name),
                    ("email", customer.email),
                    ("phone", customer.phone),
                    ("country", customer.country),
                )
                if v
            }
            if cust:
                payload["customer"] = cust

        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{settings.GENIUSPAY_API_URL}/payments",
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
            # Frais réels annoncés par GeniusPay — seule valeur qui réconciliera
            # avec le relevé. À préférer à toute estimation locale.
            fees=_as_float(data.get("fees")),
            net_amount=_as_float(data.get("net_amount")),
        )

    async def get_status(self, checkout_id: str) -> str:
        """Statut NORMALISÉ {pending, paid, failed} d'une transaction GeniusPay."""
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.get(
                f"{settings.GENIUSPAY_API_URL}/payments/{checkout_id}",
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

        Fail-closed : secret, signature ou timestamp manquant => False.
        """
        secret = settings.GENIUSPAY_WEBHOOK_SECRET
        if not secret or not signature or not timestamp:
            return False
        signed = f"{timestamp}.".encode("utf-8") + raw_body
        expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
        # compare_digest : comparaison à temps constant (anti timing attack).
        return hmac.compare_digest(expected, signature)


def _as_float(value) -> float | None:
    """Cast tolérant : GeniusPay peut renvoyer un nombre ou une chaîne."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


geniuspay_provider = GeniusPayProvider()
