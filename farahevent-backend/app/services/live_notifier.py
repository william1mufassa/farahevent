import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.event import Event
from app.models.order import Order
from app.models.participant import Participant
from app.models.enums import EventMode, OrderStatus
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

async def _send_live_links_for_event(db, event: Event):
    """Envoie le lien du live à tous les participants de l'événement."""
    logger.info(f"Envoi automatique des liens live pour l'événement: {event.name}")
    
    orders = (await db.execute(
        select(Order)
        .where(Order.event_id == event.id)
        .where(Order.status.in_([OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value]))
    )).scalars().all()
    
    count = 0
    for order in orders:
        # Fetch participant for the order
        p_res = await db.execute(select(Participant).where(Participant.id == order.participant_id))
        participant = p_res.scalar_one_or_none()
        
        if participant:
            # Reconstruct short ticket id or use full id for the streaming link
            from app.models.ticket import Ticket
            ticket_res = await db.execute(select(Ticket).where(Ticket.order_id == order.id))
            ticket = ticket_res.scalars().first()
            
            if ticket:
                ticket_short = str(ticket.id)[-8:].upper()
                await email_service.send_order_confirmation(
                    to_email=participant.email,
                    participant_name=participant.first_name,
                    event_name=event.name,
                    formula_name="Billet d'accès au Live",
                    amount_formatted=f"{order.amount} XOF",
                    ticket_id=ticket_short,
                    qr_data=ticket_short,
                    event=event,
                )
                count += 1
                
    event.live_links_sent = True
    await db.commit()
    logger.info(f"Liens envoyés avec succès à {count} participants pour {event.name}")


async def live_notifier_loop() -> None:
    """Boucle de fond : vérifie les événements qui commencent dans < 2h et envoie les emails."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                two_hours_from_now = now + timedelta(hours=2)
                
                # Cherche les événements en ligne ou hybrides qui commencent dans 2h ou moins
                # et dont les liens n'ont pas encore été envoyés.
                events = (await db.execute(
                    select(Event)
                    .where(Event.mode.in_([EventMode.ONLINE.value, EventMode.HYBRID.value]))
                    .where(Event.live_links_sent.is_(False))
                    .where(Event.date <= two_hours_from_now)
                    .where(Event.date > now - timedelta(hours=1)) # Ignore les trop vieux
                    .where(Event.status != "draft")
                )).scalars().all()
                
                for event in events:
                    await _send_live_links_for_event(db, event)
                    
        except Exception as e:
            logger.exception(f"Erreur dans la boucle de notification live : {e}")
        
        # Vérifie toutes les 5 minutes (comme pour la réconciliation)
        await asyncio.sleep(300)
