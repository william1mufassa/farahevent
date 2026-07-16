"""Génération des billets après paiement validé.

Appelé par :
- le webhook PayDunya (Sprint 5) quand un paiement digital est confirmé,
- l'endpoint admin validate-manual-payment (Sprint 4) quand un paiement manuel est validé.

Idempotent : si les tickets existent déjà pour la commande, ils sont retournés tels quels.
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

        await db.flush()
        return tickets

    async def send_tickets_bg(self, order_id: str) -> None:
        """Envoie les billets générés (Email + WhatsApp). Crée sa propre session DB."""
        from app.core.database import AsyncSessionLocal
        from app.services.email_service import email_service
        from app.services.whatsapp_service import whatsapp_service
        import uuid
        
        try:
            parsed_id = uuid.UUID(str(order_id))
        except (ValueError, TypeError):
            return

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Order, Participant, Event, Formula)
                .join(Participant, Participant.id == Order.participant_id)
                .join(Event, Event.id == Order.event_id)
                .join(Formula, Formula.id == Order.formula_id)
                .where(Order.id == parsed_id)
            )
            row = result.first()
            if not row:
                return
                
            order, participant, event, formula = row
            
            tickets_result = await db.execute(select(Ticket).where(Ticket.order_id == order.id))
            tickets = tickets_result.scalars().all()
            if not tickets:
                return

            event_date = event.date.strftime("%d/%m/%Y %H:%M") if event.date else ""
            event_venue = event.location or "En ligne"
            
            email_sent = None
            wa_sent = None
            
            for ticket in tickets:
                if ticket.type == TicketType.QR.value or ticket.type == TicketType.LIVE_LINK.value:
                    # On envoie un seul message par participant, donc on le fait lors du traitement du billet principal
                    if ticket.type == TicketType.LIVE_LINK.value and any(t.type == TicketType.QR.value for t in tickets):
                        continue # Eviter le double envoi si la formule est BOTH

                    pref = participant.ticket_delivery_pref
                    
                    # Generer le lien du live si applicable
                    stream_link = f"https://farahevent.tech/live/{event.slug}" if formula.channel in (FormulaChannel.ONLINE.value, FormulaChannel.BOTH.value) else None
                    
                    # 1. Email
                    if pref in (TicketDeliveryPref.EMAIL.value, TicketDeliveryPref.BOTH.value):
                        email_sent = await email_service.send_ticket_confirmation(
                            email=participant.email,
                            buyer_name=participant.full_name,
                            event_title=event.name,
                            event_date=event_date,
                            event_venue=event_venue,
                            ticket_category=formula.name,
                            ticket_id=str(ticket.id),
                            qr_code_base64=ticket.qr_image_url or "",
                            stream_link=stream_link,
                            amount=order.amount
                        )
                    
                    # 2. WhatsApp
                    if pref in (TicketDeliveryPref.WHATSAPP.value, TicketDeliveryPref.BOTH.value):
                        wa_sent = await whatsapp_service.send_ticket_confirmation(
                            phone=participant.whatsapp,
                            buyer_name=participant.full_name,
                            event_title=event.name,
                            event_date=event_date,
                            event_venue=event_venue,
                            ticket_category=formula.name,
                            ticket_id=str(ticket.id),
                            qr_code_base64=ticket.qr_image_url or "",
                            stream_link=stream_link,
                            amount=order.amount
                        )
                elif ticket.type == TicketType.LIVE_LINK.value:
                    # Traité ci-dessus
                    pass

            # Mettre à jour les métadonnées de la commande avec l'accusé de réception
            for ticket in tickets:
                if ticket.type == TicketType.QR.value:
                    if email_sent is True:
                        ticket.email_delivery_status = "sent"
                    elif email_sent is False:
                        ticket.email_delivery_status = "failed"
                        ticket.delivery_error_log = (ticket.delivery_error_log or "") + "[Email] Failed\n"
                    
                    if wa_sent is True:
                        ticket.whatsapp_delivery_status = "sent"
                    elif wa_sent is False:
                        ticket.whatsapp_delivery_status = "failed"
                        ticket.delivery_error_log = (ticket.delivery_error_log or "") + "[WhatsApp] Failed\n"
                
                db.add(ticket)

            if email_sent is not None or wa_sent is not None:
                current_meta = dict(order.metadata_ or {})
                delivery = current_meta.get("delivery_status", {})
                if email_sent is not None:
                    delivery["email_sent"] = email_sent
                if wa_sent is not None:
                    delivery["whatsapp_sent"] = wa_sent
                current_meta["delivery_status"] = delivery
                order.metadata_ = current_meta
                
                db.add(order)

            await db.commit()

            # Notifier l'admin en temps réel en cas d'échec (Accusé de réception d'échec)
            from app.services.notification_hub import notification_hub, ticket_delivery_failure_notification
            for ticket in tickets:
                if email_sent is False:
                    await notification_hub.broadcast({
                        "type": "notification",
                        "notification": ticket_delivery_failure_notification(
                            ticket_id=str(ticket.id),
                            participant_name=participant.full_name,
                            channel="Email"
                        )
                    })
                if wa_sent is False:
                    await notification_hub.broadcast({
                        "type": "notification",
                        "notification": ticket_delivery_failure_notification(
                            ticket_id=str(ticket.id),
                            participant_name=participant.full_name,
                            channel="WhatsApp"
                        )
                    })


ticket_service = TicketService()
