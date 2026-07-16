"""Interface abstraite du provider de paiement digital.

Le collabo remplace `stub_provider` par une implémentation PayDunya au Sprint 5.
Contrat stable : les endpoints appellent uniquement les méthodes de `PaymentProvider`,
la logique concrète est isolée derrière l'interface.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class CheckoutSession:
    """Résultat de l'initialisation d'un paiement digital."""
    checkout_id: str | None
    checkout_url: str | None
    provider: str


class PaymentProvider(ABC):
    """Contrat que doit respecter un provider (PayDunya, autre)."""

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


class StubPaymentProvider(PaymentProvider):
    """Stub pour Sprint 2 — PayDunya n'est pas encore branché.

    - `create_checkout` renvoie une URL frontend d'attente ; l'acheteur voit une page
      "En cours d'activation du provider" jusqu'au Sprint 5.
    - `get_status` renvoie toujours "pending".
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
    ) -> CheckoutSession:
        placeholder_url = f"{settings.FRONTEND_URL}/paiement/attente?order_id={order_id}"
        return CheckoutSession(
            checkout_id=None,
            checkout_url=placeholder_url,
            provider=self.name,
        )

    async def get_status(self, checkout_id: str) -> str:
        return "pending"


# Instance active — le collabo remplacera par PayDunyaProvider() en Sprint 5.
payment_provider: PaymentProvider = StubPaymentProvider()
