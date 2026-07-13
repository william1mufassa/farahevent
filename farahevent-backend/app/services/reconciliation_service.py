"""Réconciliation des paiements digitaux — filet anti-webhook-manqué (CDC §2.2.2, audit §E).

Si le webhook du provider n'arrive jamais (timeout réseau, panne provider), une
commande resterait bloquée en PENDING et l'acheteur ne recevrait pas son billet
alors qu'il a payé. Ce job interroge périodiquement le provider pour les commandes
PENDING orphelines et résout leur état :

- statut 'paid'    → order PAID + émission des billets (idempotent, verrou anti-oversell)
- statut 'failed'  → order FAILED
- 'pending' au-delà de STALE_AFTER_HOURS → FAILED (on n'attend pas indéfiniment)

Provider-agnostique : utilise `PaymentProvider.get_status`, qui doit renvoyer un
statut NORMALISÉ dans {"pending", "paid", "failed"}.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OrderStatus, PaymentProvider as PaymentProviderEnum
from app.models.order import Order
from app.services.payment_provider import payment_provider as default_provider
from app.services.ticket_service import StockExceededError, ticket_service

logger = logging.getLogger(__name__)

# Laisser au webhook le temps d'arriver avant de réconcilier.
MIN_AGE_SECONDS = 180  # 3 min
# Au-delà, on abandonne (FAILED) pour ne pas laisser une commande PENDING éternelle.
STALE_AFTER_HOURS = 24


async def reconcile_pending_orders(
    db: AsyncSession, *, provider=None, now: datetime | None = None
) -> dict:
    """Effectue une passe de réconciliation. Retourne les compteurs par issue."""
    provider = provider or default_provider
    now = now or datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(seconds=MIN_AGE_SECONDS)
    stale_before = now - timedelta(hours=STALE_AFTER_HOURS)

    stmt = (
        select(Order)
        .where(Order.status == OrderStatus.PENDING.value)
        .where(Order.payment_provider != PaymentProviderEnum.MANUAL.value)
        .where(Order.payment_provider_checkout_id.is_not(None))
        .where(Order.created_at < recent_cutoff)
    )
    orders = (await db.execute(stmt)).scalars().all()

    counts = {"checked": 0, "paid": 0, "failed": 0, "stale_failed": 0, "still_pending": 0}

    for order in orders:
        counts["checked"] += 1
        try:
            status = await provider.get_status(order.payment_provider_checkout_id)
        except Exception:
            logger.exception("Réconciliation: get_status a échoué pour order %s", order.id)
            counts["still_pending"] += 1
            continue

        if status == "paid":
            order.status = OrderStatus.PAID.value
            try:
                await ticket_service.generate_for_order(order, db)
            except StockExceededError:
                # Cas limite : payé mais stock épuisé entre-temps → alerte pour
                # traitement manuel (remboursement). L'order reste PAID.
                logger.error(
                    "Réconciliation: order %s payé mais formule épuisée — remboursement requis",
                    order.id,
                )
            counts["paid"] += 1
        elif status == "failed":
            order.status = OrderStatus.FAILED.value
            counts["failed"] += 1
        else:  # "pending"
            if order.created_at < stale_before:
                order.status = OrderStatus.FAILED.value
                counts["stale_failed"] += 1
            else:
                counts["still_pending"] += 1

    await db.flush()
    return counts
