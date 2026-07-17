"""Livraison des billets — outbox transactionnel avec retry et dead-letter.

LE PROBLÈME (audit 2026-07-16, T3.10)
`send_tickets_bg` envoyait en direct, sans aucun retry : client payé + Resend
indisponible 30 secondes = **billet jamais reçu**, et la seule alerte était une
notification WebSocket qu'un admin devait voir en direct. Pour une billetterie,
c'est le pire défaut possible : l'argent est encaissé, la contrepartie non livrée.

POURQUOI POSTGRES ET PAS REDIS (la roadmap disait « file Redis »)
Le job doit naître dans la MÊME transaction que le billet. Redis ne peut pas
participer à une transaction Postgres : on retomberait sur la course qu'on
corrige — enqueue réussi puis rollback (livraison fantôme), ou commit puis
enqueue perdu (billet jamais livré). Postgres donne l'atomicité gratuitement,
n'ajoute aucune infra à déployer, et sera sauvegardé avec le reste. Redis reste
utile pour le rate-limiter et le backplane WS (T3.6/T3.7) — pas ici.

LE FLUX
1. `enqueue_for_order(db, order)` — appelé dans la transaction qui émet le billet.
2. Une boucle de fond réclame les jobs dus (`FOR UPDATE SKIP LOCKED` : plusieurs
   workers peuvent tourner sans se marcher dessus, contrairement à la boucle de
   réconciliation).
3. Échec → `attempts += 1`, backoff exponentiel. Au-delà de MAX_ATTEMPTS →
   `failed` = dead letter : plus de tentative automatique, un humain doit agir.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery_job import DeliveryJob
from app.models.enums import FormulaChannel, TicketDeliveryPref, TicketType
from app.models.event import Event
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket

logger = logging.getLogger(__name__)

CHANNEL_EMAIL = "email"
CHANNEL_WHATSAPP = "whatsapp"

# 5 tentatives sur ~15 min cumulées : couvre une panne courte du provider sans
# harceler une adresse définitivement invalide.
MAX_ATTEMPTS = 5
# Backoff exponentiel : 30 s, 1 min, 2 min, 4 min, 8 min.
_BACKOFF_BASE_SECONDS = 30


def _backoff(attempts: int) -> timedelta:
    return timedelta(seconds=_BACKOFF_BASE_SECONDS * (2 ** max(attempts - 1, 0)))


async def enqueue_for_order(db: AsyncSession, order: Order, participant: Participant) -> list[DeliveryJob]:
    """Programme la livraison. À appeler DANS la transaction qui émet le billet.

    Ne commit pas : c'est l'appelant qui décide. C'est tout l'intérêt — le job et
    le billet vivent ou meurent ensemble.
    """
    pref = participant.ticket_delivery_pref
    channels: list[str] = []
    if pref in (TicketDeliveryPref.EMAIL.value, TicketDeliveryPref.BOTH.value):
        channels.append(CHANNEL_EMAIL)
    if pref in (TicketDeliveryPref.WHATSAPP.value, TicketDeliveryPref.BOTH.value):
        channels.append(CHANNEL_WHATSAPP)

    existing = set(
        (
            await db.execute(
                select(DeliveryJob.channel).where(DeliveryJob.order_id == order.id)
            )
        ).scalars().all()
    )

    created: list[DeliveryJob] = []
    for channel in channels:
        if channel in existing:
            continue  # rejeu : la contrainte unique le refuserait de toute façon
        job = DeliveryJob(order_id=order.id, channel=channel)
        db.add(job)
        created.append(job)
    return created


async def claim_due_jobs(db: AsyncSession, *, limit: int = 20, now: datetime | None = None) -> list[DeliveryJob]:
    """Réclame les jobs dus, verrouillés pour ce worker.

    `SKIP LOCKED` : un job déjà pris par un autre worker est ignoré au lieu de
    faire attendre. C'est ce qui rend la boucle sûre en multi-worker — la boucle
    de réconciliation, elle, refait le même travail dans chaque worker.
    """
    now = now or datetime.now(timezone.utc)
    stmt = (
        select(DeliveryJob)
        .where(DeliveryJob.status == "pending", DeliveryJob.next_attempt_at <= now)
        .order_by(DeliveryJob.next_attempt_at)
        .limit(limit)
        .with_for_update(skip_locked=True)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _send(db: AsyncSession, job: DeliveryJob) -> bool:
    """Effectue l'envoi d'un job. True si livré."""
    from app.services.email_service import email_service
    from app.services.whatsapp_service import whatsapp_service

    row = (
        await db.execute(
            select(Order, Participant, Event, Formula)
            .join(Participant, Participant.id == Order.participant_id)
            .join(Event, Event.id == Order.event_id)
            .join(Formula, Formula.id == Order.formula_id)
            .where(Order.id == job.order_id)
        )
    ).first()
    if not row:
        raise LookupError(f"Commande {job.order_id} introuvable")
    order, participant, event, formula = row

    tickets = (
        await db.execute(select(Ticket).where(Ticket.order_id == order.id))
    ).scalars().all()
    if not tickets:
        # Le job existe donc le billet a été commité avec lui : son absence est
        # une anomalie, pas une course. On lève pour que ça soit retenté puis
        # visible en dead letter, plutôt que de sortir en silence comme avant.
        raise LookupError(f"Aucun billet pour la commande {order.id}")

    # Un seul message par participant, même pour une formule 'both' (QR + live).
    ticket = next((t for t in tickets if t.type == TicketType.QR.value), tickets[0])

    stream_link = None
    if formula.channel in (FormulaChannel.ONLINE.value, FormulaChannel.BOTH.value):
        from app.core.config import settings

        # settings.FRONTEND_URL et non un domaine en dur : le lien doit pointer
        # vers l'environnement qui a émis le billet.
        stream_link = f"{settings.FRONTEND_URL}/live/{event.slug}"

    common = dict(
        buyer_name=participant.full_name,
        event_title=event.name,
        event_date=event.date.strftime("%d/%m/%Y %H:%M") if event.date else "",
        event_venue=event.location or "En ligne",
        ticket_category=formula.name,
        ticket_id=str(ticket.id),
        qr_code_base64=ticket.qr_image_url or "",
        stream_link=stream_link,
        amount=order.amount,
    )

    if job.channel == CHANNEL_EMAIL:
        ok = await email_service.send_ticket_confirmation(email=participant.email, **common)
        ticket.email_delivery_status = "sent" if ok else "failed"
    else:
        ok = await whatsapp_service.send_ticket_confirmation(phone=participant.whatsapp, **common)
        ticket.whatsapp_delivery_status = "sent" if ok else "failed"
    return bool(ok)


async def process_due_jobs(db: AsyncSession, *, limit: int = 20, now: datetime | None = None) -> dict:
    """Traite les jobs dus. Retourne un compte {claimed, sent, retried, dead}."""
    now = now or datetime.now(timezone.utc)
    counts = {"claimed": 0, "sent": 0, "retried": 0, "dead": 0}

    for job in await claim_due_jobs(db, limit=limit, now=now):
        counts["claimed"] += 1
        job_id, channel, order_id = job.id, job.channel, job.order_id
        job.attempts += 1
        try:
            delivered = await _send(db, job)
            if not delivered:
                raise RuntimeError("le provider a refusé l'envoi")
            job.status = "sent"
            job.last_error = None
            counts["sent"] += 1
        except Exception as e:
            # `str(e)` et non l'objet : après un rollback partiel, l'exception
            # peut porter des références à des objets ORM expirés.
            job.last_error = f"{type(e).__name__}: {e}"[:1000]
            if job.attempts >= MAX_ATTEMPTS:
                job.status = "failed"
                counts["dead"] += 1
                logger.error(
                    "Livraison %s de la commande %s ABANDONNÉE après %s tentatives : %s "
                    "— action manuelle requise",
                    channel, order_id, job.attempts, job.last_error,
                )
                await _notify_dead_letter(db, job_id, order_id, channel)
            else:
                job.next_attempt_at = now + _backoff(job.attempts)
                counts["retried"] += 1
                logger.warning(
                    "Livraison %s de la commande %s échouée (essai %s/%s), nouvelle tentative à %s : %s",
                    channel, order_id, job.attempts, MAX_ATTEMPTS, job.next_attempt_at, job.last_error,
                )

    await db.flush()
    return counts


async def _notify_dead_letter(db: AsyncSession, job_id, order_id, channel: str) -> None:
    """Alerte les admins connectés qu'un billet ne partira plus tout seul.

    Best-effort : une notification qui échoue ne doit pas empêcher le job d'être
    marqué `failed`, sinon on le retenterait indéfiniment. La trace qui compte est
    la ligne en base, pas la notification.
    """
    try:
        from app.services.notification_hub import (
            notification_hub,
            ticket_delivery_failure_notification,
        )

        row = (
            await db.execute(
                select(Participant.first_name, Participant.last_name)
                .select_from(Order)
                .join(Participant, Participant.id == Order.participant_id)
                .where(Order.id == order_id)
            )
        ).first()
        name = f"{row[0]} {row[1]}" if row else str(order_id)
        await notification_hub.broadcast(
            {
                "type": "notification",
                "notification": ticket_delivery_failure_notification(
                    ticket_id=str(job_id), participant_name=name, channel=channel.capitalize()
                ),
            }
        )
    except Exception:
        logger.warning("Notification de dead-letter échouée (job %s)", job_id, exc_info=True)


async def requeue_for_order(db: AsyncSession, order: Order, participant: Participant) -> int:
    """Remet la livraison en file (ré-envoi demandé par l'acheteur).

    Les jobs existants sont `sent` ou `failed` : on les remet à `pending` avec le
    compteur à zéro, plutôt que d'envoyer en direct. L'acheteur profite ainsi du
    même retry que la première fois — un ré-envoi qui échoue une fois ne doit pas
    échouer tout court. Réanime aussi une dead letter, ce qui donne à l'admin un
    moyen de relancer une livraison abandonnée.
    """
    created = await enqueue_for_order(db, order, participant)
    now = datetime.now(timezone.utc)
    existing = (
        await db.execute(select(DeliveryJob).where(DeliveryJob.order_id == order.id))
    ).scalars().all()
    revived = 0
    for job in existing:
        if job in created:
            continue
        job.status = "pending"
        job.attempts = 0
        job.next_attempt_at = now
        job.last_error = None
        revived += 1
    return len(created) + revived
