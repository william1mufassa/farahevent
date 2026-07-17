"""Endpoints publics de commande — anonymes.

Flow :
1. POST /orders/                       → upsert participant, crée order PENDING,
                                         initie la session paiement (via PaymentProvider).
2. POST /orders/{id}/manual-payment    → soumet la preuve pour un paiement manuel.
3. GET  /orders/{id}                   → statut public (polling frontend).
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import get_db
from app.models.enums import (
    EventStatus,
    FormulaChannel,
    ManualPaymentOperator,
    ManualPaymentStatus,
    OrderStatus,
    PaymentProvider as PaymentProviderEnum,
)
from app.models.event import Event
from app.models.formula import Formula
from app.models.manual_payment import ManualPayment
from app.models.order import Order
from app.models.participant import Participant
from app.models.payment_config import PaymentConfig
from app.schemas.order import OrderCreateRequest, OrderCreateResponse, OrderPublicStatus
from app.services.payment_provider import CustomerInfo, payment_provider
from app.services.pricing_service import quote as pricing_quote
from app.services.notification_hub import manual_payment_notification, notification_hub
from app.services.upload_service import upload_service
from app.services.turnstile_service import turnstile_service
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


# --------------------------------------------------------------------------- POST /orders/


@router.post("/", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_order(
    request: Request, data: OrderCreateRequest, db: AsyncSession = Depends(get_db)
):
    """Crée une commande anonyme et initie le paiement.

    - **payment_mode=digital** : retourne l'URL du provider (stub pour l'instant).
    - **payment_mode=manual**  : le frontend redirige vers l'écran d'upload de preuve.
    """
    # Anti-bot (audit §C.3) — no-op si TURNSTILE_SECRET_KEY non configuré (dev).
    client_ip = request.client.host if request.client else None
    if not await turnstile_service.verify(data.turnstile_token, client_ip):
        raise HTTPException(status_code=400, detail="Vérification anti-robot échouée. Réessayez.")

    event = await _load_active_event(db, data.event_id)
    formula = await _load_formula(db, data.formula_id, event.id)

    # Stock : si défini, refuser si épuisé
    if formula.stock is not None and formula.sold_quantity >= formula.stock:
        raise HTTPException(status_code=409, detail="Cette formule est épuisée")

    # Cohérence mode/canal (ex: pas de formule online sur un event présentiel-only)
    _validate_channel_for_event(formula, event)

    # Vérifie que le mode de paiement demandé est autorisé sur cet événement
    cfg = await _load_payment_config_or_default(db, event.id)
    if data.payment_mode == "digital" and not cfg.is_digital_enabled:
        raise HTTPException(status_code=400, detail="Paiement digital désactivé pour cet événement")
    if data.payment_mode == "manual" and not cfg.is_manual_enabled:
        raise HTTPException(status_code=400, detail="Paiement manuel désactivé pour cet événement")

    # Upsert participant (identifié par email + event)
    participant = await _upsert_participant(db, event_id=event.id, data=data.participant)

    # Prix facturé — barème dans pricing_service (source unique, testable).
    price = pricing_quote(
        base_price=formula.price,
        payment_mode=data.payment_mode,
        payment_method=data.payment_method_label,
    )
    base_price, fee, total_amount = price.base, price.fee, price.total

    # Création de la commande
    order = Order(
        event_id=event.id,
        formula_id=formula.id,
        participant_id=participant.id,
        amount=total_amount,
        currency=formula.currency,
        status=OrderStatus.PENDING.value,
        payment_provider=(
            PaymentProviderEnum.MANUAL.value
            if data.payment_mode == "manual"
            else None  # rempli par le webhook / le provider à l'init
        ),
        payment_method_label=data.payment_method_label,
        metadata_={"payment_mode": data.payment_mode, "base_amount": float(base_price), "fee_amount": float(fee)},
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    # Initialisation paiement digital via le provider
    checkout_url: str | None = None
    if data.payment_mode == "digital":
        session_result = await payment_provider.create_checkout(
            order_id=str(order.id),
            amount=float(order.amount),
            currency=order.currency,
            description=f"{event.name} — {formula.name}",
            success_url=f"{settings.FRONTEND_URL}/paiement/succes?order_id={order.id}",
            cancel_url=f"{settings.FRONTEND_URL}/paiement/echec?order_id={order.id}",
            webhook_url=f"{settings.API_URL}/webhooks/{payment_provider.name}",
            payment_method=data.payment_method_label,
            # Le provider route le mobile money vers le bon opérateur à partir du
            # numéro : sans lui, l'acheteur doit le ressaisir chez le provider.
            customer=CustomerInfo(
                name=participant.full_name,
                email=participant.email,
                phone=participant.whatsapp,
                country=participant.country,
            ),
        )
        order.payment_provider = session_result.provider
        order.payment_provider_checkout_id = session_result.checkout_id
        checkout_url = session_result.checkout_url

        # Frais RÉELS annoncés par le provider, conservés à côté de notre estimation.
        # Nos frais sont calculés à partir d'un barème figé dans le code ; seuls
        # ceux-ci réconcilieront avec le relevé. Les stocker permet de mesurer
        # l'écart au lieu de le découvrir en comptabilité (audit §11).
        if session_result.fees is not None:
            meta = dict(order.metadata_ or {})
            meta["provider_fee_amount"] = session_result.fees
            meta["provider_net_amount"] = session_result.net_amount
            meta["fee_estimate_delta"] = round(session_result.fees - float(fee), 2)
            order.metadata_ = meta

    manual_hint = (
        f"{settings.FRONTEND_URL}/paiement/manuel?order_id={order.id}"
        if data.payment_mode == "manual"
        else None
    )

    return OrderCreateResponse(
        order_id=str(order.id),
        status=order.status,
        amount=float(order.amount),
        currency=order.currency,
        payment_mode=data.payment_mode,
        checkout_url=checkout_url,
        manual_upload_hint=manual_hint,
    )


# ------------------------------------------------------- POST /orders/{id}/manual-payment


@router.post("/{order_id}/manual-payment", status_code=status.HTTP_201_CREATED)
# Endpoint PUBLIC qui écrit sur disque : sans limite, une seule commande légitime
# suffisait à marteler l'upload et saturer le volume. C'est aussi le chemin
# d'exploitation des CVE de parsing multipart (python-multipart / starlette).
#
# 20/h et pas 3/h : les opérateurs mobiles ivoiriens font du NAT massif — des
# dizaines d'acheteurs partagent une même IP publique. Une limite serrée
# bloquerait des clients réels le jour J. La vraie borne disque, c'est la purge
# des reçus orphelins ci-dessous ; ceci n'est qu'une défense en profondeur.
@limiter.limit("20/hour")
async def submit_manual_payment(
    request: Request,
    order_id: str,
    operator: str = Form(..., description="western_union / ria / moneygram / other"),
    sender_name: str = Form(..., min_length=1, max_length=200),
    sender_country: str = Form(..., min_length=2, max_length=100),
    receipt: UploadFile = File(..., description="Photo/scan du reçu de transfert"),
    db: AsyncSession = Depends(get_db),
):
    """Soumet la preuve de paiement manuel — passe l'order en MANUAL_PENDING."""
    order = await _load_order(db, order_id)

    if order.status not in (OrderStatus.PENDING.value, OrderStatus.MANUAL_PENDING.value):
        raise HTTPException(
            status_code=409,
            detail=f"Impossible de soumettre une preuve pour un order au statut {order.status}",
        )

    # Bloque la re-soumission si preuve déjà validée/rejetée
    existing = await db.execute(select(ManualPayment).where(ManualPayment.order_id == order.id))
    existing_mp = existing.scalar_one_or_none()
    if existing_mp and existing_mp.status != ManualPaymentStatus.PENDING.value:
        raise HTTPException(
            status_code=409,
            detail="Une preuve a déjà été traitée pour cette commande",
        )

    # Validation opérateur
    allowed_operators = {op.value for op in ManualPaymentOperator}
    if operator not in allowed_operators:
        raise HTTPException(
            status_code=400,
            detail=f"Opérateur invalide. Autorisés : {', '.join(sorted(allowed_operators))}",
        )

    receipt_url = await upload_service.save_receipt(receipt)

    if existing_mp:
        # Écrase la preuve précédente qui était encore en pending.
        # Purge l'ancien fichier : sans cela, chaque re-soumission laissait un
        # fichier de 5 Mo que plus rien ne référençait — croissance disque non
        # bornée sur un endpoint public. Best-effort : ne casse jamais la
        # soumission d'un acheteur qui a payé.
        old_key = existing_mp.receipt_image_url
        existing_mp.operator = operator
        existing_mp.sender_name = sender_name
        existing_mp.sender_country = sender_country
        existing_mp.receipt_image_url = receipt_url
        manual_payment = existing_mp
        if old_key and old_key != receipt_url:
            await upload_service.delete_receipt(old_key)
    else:
        manual_payment = ManualPayment(
            order_id=order.id,
            operator=operator,
            sender_name=sender_name,
            sender_country=sender_country,
            receipt_image_url=receipt_url,
            status=ManualPaymentStatus.PENDING.value,
        )
        db.add(manual_payment)

    order.status = OrderStatus.MANUAL_PENDING.value
    order.payment_provider = PaymentProviderEnum.MANUAL.value
    order.payment_method_label = operator

    await db.flush()

    # Notifie en temps réel les admins connectés (fire-and-forget : n'affecte
    # jamais la soumission du client si le hub, la requête ou une socket échoue).
    # Le store front déduplique par id (mp-<id>) avec le seed HTTP.
    try:
        row = (
            await db.execute(
                select(Participant.first_name, Participant.last_name, Formula.name)
                .select_from(Order)
                .join(Participant, Participant.id == Order.participant_id)
                .join(Formula, Formula.id == Order.formula_id)
                .where(Order.id == order.id)
            )
        ).first()
        if row:
            fn, ln, formula_name = row
            await notification_hub.broadcast(
                {
                    "type": "notification",
                    "notification": manual_payment_notification(
                        mp_id=manual_payment.id,
                        created_at=datetime.now(timezone.utc),
                        operator=manual_payment.operator,
                        first_name=fn,
                        last_name=ln,
                        formula_name=formula_name,
                    ),
                }
            )
    except Exception:
        logger.warning("Push WS notification (paiement manuel) échoué", exc_info=True)

    return {
        "order_id": str(order.id),
        "manual_payment_id": str(manual_payment.id),
        "status": order.status,
        "message": "Preuve reçue — validation admin sous 2 à 12h.",
    }


# --------------------------------------------------------------------------- GET /orders/{id}


@router.get("/{order_id}", response_model=OrderPublicStatus)
async def get_order_status(order_id: str, db: AsyncSession = Depends(get_db)):
    """Statut public d'une commande — utilisé par le frontend pour polling."""
    order = await _load_order(db, order_id)

    event_result = await db.execute(select(Event).where(Event.id == order.event_id))
    event = event_result.scalar_one_or_none()
    formula_result = await db.execute(select(Formula).where(Formula.id == order.formula_id))
    formula = formula_result.scalar_one_or_none()
    mp_result = await db.execute(select(ManualPayment).where(ManualPayment.order_id == order.id))
    manual_payment = mp_result.scalar_one_or_none()

    return OrderPublicStatus(
        id=str(order.id),
        status=order.status,
        amount=float(order.amount),
        currency=order.currency,
        payment_mode=(order.metadata_ or {}).get("payment_mode"),
        payment_method_label=order.payment_method_label,
        event={
            "id": str(event.id) if event else None,
            "name": event.name if event else None,
            "slug": event.slug if event else None,
            "date": event.date.isoformat() if event and event.date else None,
        },
        formula={
            "id": str(formula.id) if formula else None,
            "name": formula.name if formula else None,
        },
        manual_payment_status=manual_payment.status if manual_payment else None,
        created_at=order.created_at,
    )


# ----------------------------------------------------------------------------- helpers


async def _load_active_event(db: AsyncSession, event_id: str) -> Event:
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")

    result = await db.execute(
        select(Event)
        .where(Event.id == parsed)
        .where(Event.is_deleted == False)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    if event.status != EventStatus.OPEN.value:
        raise HTTPException(
            status_code=409, detail=f"La billetterie n'est pas ouverte (statut : {event.status})"
        )
    return event


async def _load_formula(db: AsyncSession, formula_id: str, event_id) -> Formula:
    try:
        parsed = uuid.UUID(formula_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="formula_id invalide")

    result = await db.execute(select(Formula).where(Formula.id == parsed))
    formula = result.scalar_one_or_none()
    if not formula or formula.event_id != event_id:
        raise HTTPException(status_code=404, detail="Formule introuvable pour cet événement")
    if not formula.is_active:
        raise HTTPException(status_code=409, detail="Formule désactivée")
    return formula


async def _load_order(db: AsyncSession, order_id: str) -> Order:
    try:
        parsed = uuid.UUID(order_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="order_id invalide")
    result = await db.execute(select(Order).where(Order.id == parsed))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return order


async def _load_payment_config_or_default(db: AsyncSession, event_id) -> PaymentConfig:
    result = await db.execute(select(PaymentConfig).where(PaymentConfig.event_id == event_id))
    cfg = result.scalar_one_or_none()
    if cfg:
        return cfg
    # Défaut quand l'admin n'a rien configuré : LES DEUX modes ouverts.
    #
    # L'ancien défaut (digital seul) rendait tout nouvel événement invendable dès
    # que le digital était indisponible — l'acheteur atterrissait sur une page
    # d'attente sans issue, et le manuel, seule voie réellement fonctionnelle,
    # était fermé (audit 2026-07-16). Un défaut ne doit jamais fermer l'unique
    # chemin qui marche.
    return PaymentConfig(event_id=event_id, is_digital_enabled=True, is_manual_enabled=True)


def _validate_channel_for_event(formula: Formula, event: Event):
    """Interdit une formule 'online' sur un event 'presentiel' et inversement."""
    if formula.channel == FormulaChannel.BOTH.value:
        return
    if event.mode == "hybrid":
        return
    if formula.channel != event.mode:
        raise HTTPException(
            status_code=400,
            detail=f"Formule '{formula.channel}' incompatible avec l'événement '{event.mode}'",
        )


async def _upsert_participant(
    db: AsyncSession, *, event_id, data
) -> Participant:
    """Réutilise le participant déjà présent pour (email, event) s'il existe.

    ⚠ Les coordonnées d'un participant qui a DÉJÀ payé sont GELÉES.

    Cet endpoint est anonyme : sans ce gel, quiconque connaît l'email d'un
    acheteur pouvait créer une commande sur le même événement et réécrire son
    `whatsapp`. La livraison (`send_tickets_bg` lit `participant.whatsapp`) et le
    ré-envoi partaient alors chez l'attaquant — vol de billet sans jamais toucher
    à un compte.

    Avant paiement, la mise à jour reste utile et inoffensive : aucun billet
    n'existe encore, et l'acheteur corrige légitimement une faute de frappe.
    Après paiement, un vrai changement de coordonnées passe par l'admin.
    """
    q = (
        select(Participant)
        .join(Order, Order.participant_id == Participant.id)
        .where(Participant.email == data.email)
        .where(Order.event_id == event_id)
        .limit(1)
    )
    result = await db.execute(q)
    existing = result.scalar_one_or_none()
    if existing:
        already_paid = await db.scalar(
            select(func.count(Order.id)).where(
                Order.participant_id == existing.id,
                Order.status.in_(
                    (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value)
                ),
            )
        )
        if already_paid:
            logger.warning(
                "Commande anonyme sur l'email d'un acheteur déjà payé "
                "(participant=%s) — coordonnées conservées, non écrasées.",
                existing.id,
            )
            return existing

        existing.first_name = data.first_name
        existing.last_name = data.last_name
        existing.whatsapp = data.whatsapp
        existing.country = data.country
        existing.city = data.city
        existing.ticket_delivery_pref = data.ticket_delivery_pref.value
        return existing

    participant = Participant(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        whatsapp=data.whatsapp,
        country=data.country,
        city=data.city,
        ticket_delivery_pref=data.ticket_delivery_pref.value,
    )
    db.add(participant)
    await db.flush()
    await db.refresh(participant)
    return participant
