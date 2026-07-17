"""Accès participant au Live.

Le droit au Live vient de la formule ACHETÉE (`formula.channel`), pas du mode de
l'événement : sur un hybride, un billet présentiel-only n'ouvre pas le streaming.
"""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import create_live_token, decode_live_token
from app.models.enums import EventMode, FormulaChannel, OrderStatus
from app.models.event import Event
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket
from app.schemas.live import LiveAccessRequest, LiveAccessResponse

router = APIRouter()

# Alphabet réel d'une référence de billet : hex + tirets d'UUID. Tout le reste
# (dont les jokers ILIKE % et _) est refusé avant d'atteindre la base.
_SHORT_REF_RE = re.compile(r"^[0-9a-f-]{4,36}$")


@router.post("/access", response_model=LiveAccessResponse)
@limiter.limit("10/minute")
async def request_live_access(
    request: Request, req: LiveAccessRequest, db: AsyncSession = Depends(get_db)
):
    """
    Vérifie le billet et l'ordre, et retourne un token JWT pour le Live.
    """
    # 1. Nettoyer la référence entrée
    ref_input = req.order_ref.strip().lower()

    # 2. Chercher la commande (si la ref entrée correspond à l'ID complet ou court de la commande)
    order = None
    try:
        req_uuid = uuid.UUID(ref_input)
        result = await db.execute(
            select(Order)
            .join(Participant, Order.participant_id == Participant.id)
            .options(selectinload(Order.event))
            .where(Order.id == req_uuid, Participant.email == req.email)
        )
        order = result.scalar_one_or_none()
    except ValueError:
        pass # Pas un UUID valide, on continue la recherche par référence courte

    participant = None
    if order:
        p_res = await db.execute(select(Participant).where(Participant.id == order.participant_id))
        participant = p_res.scalar_one_or_none()

    # 3. Si non trouvé, on cherche par le billet (UUID complet ou les 8 derniers caractères)
    #
    # `ref_input` est interpolé dans un motif ILIKE. SQLAlchemy paramètre la valeur
    # (donc pas d'injection SQL), MAIS `%` et `_` restent des JOKERS : `ref="%"`
    # matchait n'importe quel billet de l'email fourni. On borne donc l'entrée à
    # l'alphabet réel d'une référence (hex + tirets) plutôt que d'échapper — un
    # allowlist se raisonne, un échappement s'oublie.
    if not order and _SHORT_REF_RE.match(ref_input):
        from sqlalchemy import cast, String
        ticket_result = await db.execute(
            select(Ticket)
            .join(Participant, Ticket.participant_id == Participant.id)
            .options(selectinload(Ticket.order).selectinload(Order.event))
            .where(
                cast(Ticket.id, String).ilike(f"%{ref_input}"),
                Participant.email == req.email
            )
        )
        ticket = ticket_result.scalar_one_or_none()
        if ticket:
            order = ticket.order
            p_res = await db.execute(select(Participant).where(Participant.id == ticket.participant_id))
            participant = p_res.scalar_one_or_none()

    if not order or not participant:
        raise HTTPException(status_code=404, detail="Référence ou email invalide")

    # Un paiement manuel validé donne exactement les mêmes droits qu'un paiement
    # digital — c'est la convention de tout le reste du code (scan, tickets…).
    # N'accepter que PAID fermait le Live à TOUS les clients réels tant que le
    # digital n'encaissait pas.
    if order.status not in (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value):
        raise HTTPException(status_code=403, detail="Votre billet n'est pas encore payé")

    event = order.event
    if event.mode not in (EventMode.ONLINE.value, EventMode.HYBRID.value):
        raise HTTPException(status_code=403, detail="Cet événement ne dispose pas de Live")

    # Le droit au Live vient de la formule ACHETÉE, pas du mode de l'événement :
    # sur un événement hybride, un billet présentiel-only ne donne pas le Live.
    # Sans cette vérification, l'accès en ligne était offert à qui n'avait pas
    # payé pour lui (fuite de revenu).
    formula = await db.get(Formula, order.formula_id)
    if not formula or formula.channel not in (
        FormulaChannel.ONLINE.value,
        FormulaChannel.BOTH.value,
    ):
        raise HTTPException(
            status_code=403, detail="Votre billet ne donne pas accès au Live"
        )

    token = create_live_token(str(participant.id), str(event.id))
    return {"token": token}


@router.get("/session")
async def get_live_session(token: str, db: AsyncSession = Depends(get_db)):
    """
    Récupère l'état actuel de la session Live à partir d'un JWT de participant.
    """
    payload = decode_live_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        
    event_id = payload.get("event_id")
    if not event_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    result = await db.execute(select(Event).where(Event.id == uuid.UUID(event_id)))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable")

    # Fetch participant for viewer info
    participant_id = payload.get("sub")
    viewer_info = None
    if participant_id:
        p_res = await db.execute(select(Participant).where(Participant.id == uuid.UUID(participant_id)))
        participant = p_res.scalar_one_or_none()
        if participant:
            viewer_info = {
                "name": f"{participant.first_name} {participant.last_name}",
                "email": participant.email
            }

    # Retourner l'état actuel, l'URL HLS, etc.
    state = "playing" if event.stream_hls_url else "waiting"
    
    return {
        "state": state,
        "viewer_count": 0, # Mettre à jour par WS normalement
        "stream_url": event.stream_hls_url,
        "replay_url": None,
        "event": {
            "name": event.name,
            "slug": event.slug
        },
        "viewer": viewer_info,
        "subtitles": [],
        "starts_at": event.date.isoformat() if event.date else None,
        "support": {
            "service_name": "FarahEvent Support",
            "whatsapp_number": None
        }
    }
