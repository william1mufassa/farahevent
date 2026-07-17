"""Génération des billets après paiement validé.

Appelé par :
- le webhook GeniusPay (`POST /webhooks/geniuspay`) quand un paiement est confirmé,
- `admin/manual-payments/{id}/validate` quand un paiement manuel est validé,
- la réconciliation, quand un webhook s'est perdu.

Idempotent : si les billets existent déjà pour la commande, ils sont retournés tels quels.

L'émission **programme aussi la livraison** (`delivery_service.enqueue_for_order`)
dans la MÊME transaction : le billet et son job de livraison commitent ensemble.
C'est ce qui garantit qu'un billet émis sera livré — l'ancien envoi en
fire-and-forget pouvait partir avant le commit et ne rien voir (T3.10).
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import FormulaChannel, TicketType, TicketDeliveryPref
from app.models.event import Event
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket
from app.services.qr_service import qr_service


class TicketGenerationError(Exception):
    pass


class StockExceededError(Exception):
    """Levée quand la formule est épuisée au moment de l'émission (anti-oversell)."""
    pass


class TicketService:
    async def generate_for_order(self, order: Order, db: AsyncSession) -> list[Ticket]:
        """Génère les billets pour un order — idempotent et protégé contre l'oversell.

        Verrou pessimiste (SELECT ... FOR UPDATE) sur la formule : sérialise les
        émissions concurrentes d'une même formule, avec garde de stock transactionnelle
        et compteur `sold_quantity` exact (audit A.2/E.3 — la survente venait de N
        commandes validées en parallèle sans re-vérifier le stock au moment d'émettre).
        """
        # Verrou sur la formule AVANT toute décision d'émission.
        formula_result = await db.execute(
            select(Formula).where(Formula.id == order.formula_id).with_for_update()
        )
        formula = formula_result.scalar_one_or_none()
        if not formula:
            raise TicketGenerationError(f"Formule introuvable pour order {order.id}")

        # Idempotence sous verrou : si les billets existent déjà, on les renvoie.
        existing_result = await db.execute(select(Ticket).where(Ticket.order_id == order.id))
        existing = existing_result.scalars().all()
        if existing:
            return list(existing)

        # Garde de stock transactionnelle : refuse si épuisé.
        if formula.stock is not None and formula.sold_quantity >= formula.stock:
            raise StockExceededError(f"Formule '{formula.name}' épuisée (stock {formula.stock})")

        event_result = await db.execute(select(Event).where(Event.id == order.event_id))
        event = event_result.scalar_one_or_none()
        if not event:
            raise TicketGenerationError(f"Événement introuvable pour order {order.id}")

        participant_result = await db.execute(
            select(Participant).where(Participant.id == order.participant_id)
        )
        participant = participant_result.scalar_one_or_none()
        if not participant:
            raise TicketGenerationError(f"Participant introuvable pour order {order.id}")

        tickets: list[Ticket] = []

        # Un billet présentiel (QR) si la formule couvre le présentiel
        if formula.channel in (FormulaChannel.PRESENTIEL.value, FormulaChannel.BOTH.value):
            qr_ticket = Ticket(
                order_id=order.id,
                participant_id=participant.id,
                event_id=event.id,
                formula_id=formula.id,
                type=TicketType.QR.value,
            )
            db.add(qr_ticket)
            await db.flush()
            await db.refresh(qr_ticket)

            jwt_token = qr_service.encode_ticket_jwt(
                ticket_id=str(qr_ticket.id),
                event_id=str(event.id),
                formula_id=str(formula.id),
                participant_name=participant.full_name,
            )
            qr_ticket.qr_token = jwt_token
            qr_ticket.qr_image_url = qr_service.render_qr_image_data_url(jwt_token)
            tickets.append(qr_ticket)

        # Un billet live si la formule couvre l'online — le live_token n'est pas encore
        # exploité (Phase 5 streaming), mais on l'émet dès maintenant pour ne pas avoir
        # à re-régénérer les billets plus tard.
        if formula.channel in (FormulaChannel.ONLINE.value, FormulaChannel.BOTH.value):
            live_ticket = Ticket(
                order_id=order.id,
                participant_id=participant.id,
                event_id=event.id,
                formula_id=formula.id,
                type=TicketType.LIVE_LINK.value,
            )
            db.add(live_ticket)
            await db.flush()
            await db.refresh(live_ticket)

            # Live token émis comme JWT signé (mêmes claims que le QR mais type distinct)
            live_ticket.live_token = qr_service.encode_ticket_jwt(
                ticket_id=str(live_ticket.id),
                event_id=str(event.id),
                formula_id=str(formula.id),
                participant_name=participant.full_name,
            )
            tickets.append(live_ticket)

        # Une commande = une place vendue, même si elle émet 2 billets (QR + live
        # pour une formule 'both'). Incrément sous le verrou FOR UPDATE acquis plus
        # haut → compteur exact, pas de survente (audit §E.3 + A.2).
        if tickets:
            formula.sold_quantity += 1

            # Livraison programmée DANS CETTE TRANSACTION (T3.10). C'est le point
            # clé : le job et le billet commitent ensemble. Aucune fenêtre où l'un
            # existe sans l'autre — l'ancien `create_task` partait avant le commit
            # et pouvait ne rien voir. Ici, si la commande rollback, le job
            # n'existe pas ; si elle commit, la livraison est garantie d'être
            # tentée, et retentée.
            from app.services.delivery_service import enqueue_for_order

            await enqueue_for_order(db, order, participant)

        await db.flush()
        return tickets


ticket_service = TicketService()
