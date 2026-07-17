"""Remboursement d'une commande — passage en REFUNDED + libération de la place.

Extrait pour être partagé par les DEUX déclencheurs possibles, qui doivent se
comporter identiquement :
- l'admin, via `POST /admin/transactions/{id}/refund` ;
- le provider, via le webhook `payment.refunded`.

Dupliquer de la logique d'argent, c'est garantir qu'elle divergera.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OrderStatus
from app.models.formula import Formula
from app.models.order import Order

logger = logging.getLogger(__name__)

_REFUNDABLE = (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value)


class NotRefundableError(Exception):
    """La commande n'est pas dans un état remboursable."""


async def refund_order(db: AsyncSession, order: Order) -> None:
    """Passe la commande en REFUNDED et libère une place.

    Idempotent : une commande déjà REFUNDED est un no-op (le provider rejoue ses
    webhooks — sans cette garde, un rejeu libérerait une seconde place et
    fausserait `sold_quantity`).

    Le billet n'est pas supprimé : `POST /tickets/scan` refuse déjà tout ticket
    dont l'order n'est pas PAID/MANUAL_VALIDATED. Passer en REFUNDED l'invalide
    donc de fait — et conserve la trace pour l'audit.
    """
    if order.status == OrderStatus.REFUNDED.value:
        return

    if order.status not in _REFUNDABLE:
        raise NotRefundableError(
            f"Seule une commande payée est remboursable (statut {order.status})"
        )

    # Verrou sur la formule : `sold_quantity` doit rester exact face aux émissions
    # concurrentes (même invariant que l'anti-oversell de ticket_service).
    formula = (
        await db.execute(
            select(Formula).where(Formula.id == order.formula_id).with_for_update()
        )
    ).scalar_one_or_none()
    if formula and formula.sold_quantity > 0:
        formula.sold_quantity -= 1

    order.status = OrderStatus.REFUNDED.value
