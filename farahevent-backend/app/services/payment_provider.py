"""Interface abstraite du provider de paiement digital.

Contrat stable : les endpoints n'appellent QUE les méthodes de `PaymentProvider` ;
la logique concrète est isolée derrière l'interface. Provider actif : GeniusPay
(cf. `_select_provider` en bas de fichier). PayDunya est abandonné.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CheckoutSession:
    """Résultat de l'initialisation d'un paiement digital."""
    checkout_id: str | None
    checkout_url: str | None
    provider: str
    # Frais RÉELS prélevés par le provider, tels qu'il les annonce. `None` si le
    # provider ne les communique pas. À préférer systématiquement à une estimation
    # locale : c'est la seule valeur qui réconciliera avec le relevé (audit §11).
    fees: float | None = None
    net_amount: float | None = None


@dataclass
class CustomerInfo:
    """Identité de l'acheteur transmise au provider.

    Pas cosmétique : GeniusPay route automatiquement un paiement mobile money
    vers le bon opérateur (Orange/MTN/Moov) à partir du numéro — sans lui,
    l'acheteur doit le ressaisir sur la page du provider.
    """
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    country: str | None = None  # ISO2 (CI, SN…)


class PaymentProvider(ABC):
    """Contrat que doit respecter un provider de paiement digital."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
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
        customer: "CustomerInfo | None" = None,
    ) -> CheckoutSession:
        """Initie une session de paiement chez le provider."""
        ...

    @abstractmethod
    async def get_status(self, checkout_id: str) -> str:
        """Retourne un statut NORMALISÉ dans {"pending", "paid", "failed"}.

        Consommé tel quel par le job de réconciliation — chaque provider concret
        mappe ses propres statuts vers ces trois valeurs.
        """
        ...

    def verify_webhook_signature(
        self, *, timestamp: str, raw_body: bytes, signature: str
    ) -> bool:
        """Authentifie un webhook entrant. Fait partie du CONTRAT : l'endpoint
        webhook n'appelle que cette méthode, jamais un provider concret.

        Défaut **fail-closed** : un provider qui n'implémente pas la vérification
        rejette tous les webhooks. L'inverse (accepter par défaut) laisserait
        n'importe qui marquer une commande comme payée en forgeant un POST.
        """
        return False


class StubPaymentProvider(PaymentProvider):
    """Repli quand aucune clé GeniusPay n'est configurée (dev, ou `.env` incomplet).

    - `create_checkout` renvoie une page d'attente frontend — l'acheteur voit un
      message explicite plutôt qu'une erreur 401 opaque.
    - `get_status` renvoie toujours "pending" : la réconciliation ne marquera donc
      jamais une commande PAID à tort, elle expirera en FAILED après 24 h.
    - `verify_webhook_signature` hérite du défaut fail-closed (rejette tout).
    """

    @property
    def name(self) -> str:
        return "stub"

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
        customer: "CustomerInfo | None" = None,
    ) -> CheckoutSession:
        placeholder_url = f"{settings.FRONTEND_URL}/paiement/attente?order_id={order_id}"
        return CheckoutSession(
            checkout_id=None,
            checkout_url=placeholder_url,
            provider=self.name,
        )

    async def get_status(self, checkout_id: str) -> str:
        return "pending"


def _select_provider() -> PaymentProvider:
    """Provider actif : GeniusPay dès que les clés sont configurées, sinon le stub.

    Le repli sur le stub n'est PAS de la complaisance : sans clés, chaque appel
    GeniusPay renverrait un 401 et l'acheteur verrait une erreur opaque. Le stub
    l'amène sur une page d'attente explicite. Le boot logge lequel est actif —
    sans ce log, un `.env` incomplet en prod passerait inaperçu et TOUTES les
    ventes digitales tomberaient dans le vide (cf. audit 2026-07-16).
    """
    if settings.GENIUSPAY_API_KEY and settings.GENIUSPAY_SECRET_KEY:
        from app.services.geniuspay_provider import GeniusPayProvider

        logger.info("Paiement digital : GeniusPay (mode=%s)", settings.GENIUSPAY_MODE)
        return GeniusPayProvider()

    logger.warning(
        "Paiement digital : STUB actif — GENIUSPAY_API_KEY/SECRET_KEY absents. "
        "Aucun paiement digital ne sera encaissé."
    )
    return StubPaymentProvider()


payment_provider: PaymentProvider = _select_provider()
