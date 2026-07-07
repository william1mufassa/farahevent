"""Génération des billets après paiement validé.

Appelé par :
- le webhook PayDunya (Sprint 5) quand un paiement digital est confirmé,
- l'endpoint admin validate-manual-payment (Sprint 4) quand un paiement manuel est validé.

Idempotent : si les tickets existent déjà pour la commande, ils sont retournés tels quels.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import FormulaChannel, TicketType
from app.models.event import Event
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket
from app.services.qr_service import qr_service


class TicketGenerationError(Exception):
    pass


class TicketService:
    async def generate_for_order(self, order: Order, db: AsyncSession) -> list[Ticket]:
        """Génère les billets pour un order — idempotent."""
        existing_result = await db.execute(select(Ticket).where(Ticket.order_id == order.id))
        existing = existing_result.scalars().all()
        if existing:
            return list(existing)

        formula_result = await db.execute(select(Formula).where(Formula.id == order.formula_id))
        formula = formula_result.scalar_one_or_none()
        if not formula:
            raise TicketGenerationError(f"Formule introuvable pour order {order.id}")

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

        # Stock (info non transactionnelle : la vraie protection est le lock sur la commande)
        formula.sold_quantity += len(tickets)

        await db.flush()
        return tickets


ticket_service = TicketService()
