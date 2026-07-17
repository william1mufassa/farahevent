"""Webhooks des providers de paiement.

`POST /webhooks/geniuspay` — notification de paiement. C'est le chemin par lequel
une commande devient un billet : la surface la plus sensible de l'API.

Défenses, dans l'ordre (les moins chères d'abord — un POST forgé coûte un HMAC,
jamais une requête SQL) :
1. Signature HMAC-SHA256 sur le corps BRUT (jamais un dict re-sérialisé).
2. Anti-rejeu : le timestamp signé doit être dans une fenêtre serrée.
3. Idempotence : rejouer un webhook légitime est un no-op. Le provider REJOUE
   volontairement tant qu'il n'a pas de 2xx — ce n'est pas un cas limite.

Codes de retour — un webhook n'est pas une API publique, les codes pilotent les
retries du provider :
- 401 : signature/timestamp invalide → refusé.
- 200 : traité, OU définitivement inexploitable (commande inconnue, statut non
        terminal). Renvoyer une erreur ferait retenter le provider pour rien.
- 5xx : panne de notre côté → on VEUT que le provider retente.
"""
import json
import logging
import time
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.enums import OrderStatus
from app.models.order import Order
from app.services.payment_provider import payment_provider
from app.services.refund_service import NotRefundableError, refund_order
from app.services.ticket_service import StockExceededError, ticket_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Fenêtre d'acceptation du timestamp signé. Trop large = fenêtre de rejeu ouverte ;
# trop serrée = webhooks légitimes rejetés sur une dérive d'horloge.
_TIMESTAMP_TOLERANCE_SECONDS = 300  # 5 min

# Statuts GeniusPay valant encaissement effectif.
_PAID_STATUSES = {"completed"}
# Statuts terminaux négatifs.
_FAILED_STATUSES = {"failed", "cancelled", "expired"}
# Remboursement : traité à part — l'argent est rendu APRÈS un encaissement, il
# faut donc libérer la place et invalider le billet, pas juste marquer un échec.
_REFUNDED_STATUSES = {"refunded"}


@router.post("/geniuspay", status_code=status.HTTP_200_OK)
async def geniuspay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Notification de paiement GeniusPay → commande PAID + émission du billet."""
    raw_body = await request.body()
    signature = request.headers.get("X-Webhook-Signature", "")
    timestamp = request.headers.get("X-Webhook-Timestamp", "")
    event = request.headers.get("X-Webhook-Event", "")

    # --- 1. Authenticité (avant toute lecture du corps ou accès base) ---
    if not payment_provider.verify_webhook_signature(
        timestamp=timestamp, raw_body=raw_body, signature=signature
    ):
        logger.warning(
            "Webhook GeniusPay: signature invalide (event=%s, ip=%s)",
            event,
            request.client.host if request.client else None,
        )
        raise HTTPException(status_code=401, detail="Signature invalide")

    # --- 2. Anti-rejeu ---
    try:
        sent_at = int(float(timestamp))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Timestamp invalide")
    drift = abs(int(time.time()) - sent_at)
    if drift > _TIMESTAMP_TOLERANCE_SECONDS:
        logger.warning("Webhook GeniusPay: timestamp hors tolérance (%ss)", drift)
        raise HTTPException(status_code=401, detail="Timestamp hors tolérance")

    # --- 3. Corps ---
    try:
        payload = json.loads(raw_body or b"{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Corps JSON invalide")

    data = payload.get("data") or payload
    order_id = (data.get("metadata") or {}).get("order_id")
    reference = data.get("reference")
    gp_status = str(data.get("status", "")).lower()

    if not order_id:
        # Signé mais inexploitable : ne pas faire retenter le provider pour rien.
        logger.error("Webhook GeniusPay: metadata.order_id absent (ref=%s)", reference)
        return {"received": True, "handled": False, "reason": "missing_order_id"}

    try:
        parsed_id = uuid.UUID(str(order_id))
    except (ValueError, TypeError):
        logger.error("Webhook GeniusPay: order_id invalide (%s)", order_id)
        return {"received": True, "handled": False, "reason": "bad_order_id"}

    order = (
        await db.execute(select(Order).where(Order.id == parsed_id))
    ).scalar_one_or_none()
    if not order:
        logger.error("Webhook GeniusPay: commande %s introuvable", parsed_id)
        return {"received": True, "handled": False, "reason": "order_not_found"}

    # --- 4. Remboursement — AVANT la garde d'idempotence ---
    # Une commande remboursée est forcément déjà PAID : la garde ci-dessous
    # l'avalerait et le remboursement serait ignoré en silence, laissant le billet
    # valide alors que l'argent est rendu. `payment.refunded` fait partie des
    # événements auxquels le compte est abonné — ce n'est pas hypothétique.
    if gp_status in _REFUNDED_STATUSES or event == "payment.refunded":
        if order.status == OrderStatus.REFUNDED.value:
            return {"received": True, "handled": True, "reason": "already_refunded"}
        try:
            await refund_order(db, order)
        except NotRefundableError:
            # Remboursement d'une commande jamais payée de notre côté : rien à
            # libérer. On acquitte pour ne pas faire retenter le provider.
            logger.warning(
                "Webhook GeniusPay: refund sur commande %s au statut %s — ignoré",
                parsed_id,
                order.status,
            )
            return {"received": True, "handled": False, "reason": "not_refundable"}
        logger.info("Webhook GeniusPay: commande %s → REFUNDED, place libérée", parsed_id)
        return {"received": True, "handled": True, "status": order.status}

    # --- 5. Idempotence — un rejeu ne change rien ---
    if order.status in (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value):
        return {"received": True, "handled": True, "reason": "already_paid"}

    # Trace la référence provider dès le 1er webhook : sans elle, la réconciliation
    # ne saurait pas quelle transaction interroger si un webhook se perd ensuite.
    if reference and not order.payment_provider_checkout_id:
        order.payment_provider_checkout_id = reference
    if not order.payment_provider:
        order.payment_provider = payment_provider.name

    # --- 6. Effet métier ---
    if gp_status in _FAILED_STATUSES:
        order.status = OrderStatus.FAILED.value
        logger.info("Webhook GeniusPay: commande %s → FAILED (%s)", parsed_id, gp_status)
        return {"received": True, "handled": True, "status": order.status}

    if gp_status not in _PAID_STATUSES:
        # pending / processing : rien à faire, la réconciliation prendra le relais.
        return {"received": True, "handled": False, "reason": f"status_{gp_status}"}

    order.status = OrderStatus.PAID.value
    try:
        await ticket_service.generate_for_order(order, db)
    except StockExceededError:
        # Payé mais stock épuisé entre-temps : la commande RESTE payée (l'argent est
        # encaissé), on alerte pour remboursement manuel. Ne jamais annuler
        # silencieusement un paiement réel.
        logger.error(
            "Webhook GeniusPay: commande %s payée mais formule épuisée — "
            "REMBOURSEMENT REQUIS",
            parsed_id,
        )
        return {
            "received": True,
            "handled": True,
            "status": order.status,
            "warning": "sold_out",
        }

    # Livraison après la réponse (donc après le commit de get_db) : send_tickets_bg
    # ouvre sa PROPRE session et ne verrait pas les billets si elle partait avant.
    # C'est la course décrite en T3.10 — évitée ici via BackgroundTasks.
    background_tasks.add_task(ticket_service.send_tickets_bg, str(parsed_id))

    logger.info("Webhook GeniusPay: commande %s → PAID, billets émis", parsed_id)
    return {"received": True, "handled": True, "status": order.status}
