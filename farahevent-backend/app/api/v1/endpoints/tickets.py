"""Endpoints billets.

- POST /scan  (admin)  : lecture QR, vérification et invalidation single-use.
- GET  /{id}/qr (admin) : récupérer l'image QR d'un ticket (pour ré-envoi manuel).
- POST /resend (public) : re-livraison d'un billet à l'acheteur.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole, EventStatus, OrderStatus, ScanResult, TicketType
from app.models.event import Event
from app.models.formula import Formula
from app.models.order import Order
from app.models.participant import Participant
from app.models.scan_log import ScanLog
from app.models.ticket import Ticket
from app.schemas.order import TicketResendRequest
from app.schemas.ticket import ScanRequest, ScanResponse
from app.services.qr_service import qr_service

router = APIRouter()


_SCAN_ROLES = (AdminRole.AGENT, AdminRole.SUPER_ADMIN)


# ------------------------------------------------------------ POST /tickets/scan


@router.post("/scan", response_model=ScanResponse)
async def scan_ticket(
    data: ScanRequest,
    admin: Admin = Depends(require_roles(*_SCAN_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Scanne un QR et invalide le ticket (single-use). <200ms attendu."""
    claims = qr_service.decode_ticket_jwt(data.qr_token)
    if not claims:
        await _log_scan(db, admin, ticket_id=None, event_id=None, result=ScanResult.INVALID, reason="invalid_token")
        return ScanResponse(valid=False, reason="invalid_token")

    ticket_id = _safe_uuid(claims["sub"])
    if not ticket_id:
        return ScanResponse(valid=False, reason="invalid_token")

    # SELECT ... FOR UPDATE pour éviter deux scans concurrents qui passeraient tous les deux
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        await _log_scan(db, admin, ticket_id=None, event_id=None, result=ScanResult.INVALID, reason="ticket_not_found")
        return ScanResponse(valid=False, reason="ticket_not_found")

    if ticket.type != TicketType.QR.value:
        await _log_scan(db, admin, ticket_id=ticket.id, event_id=ticket.event_id, result=ScanResult.INVALID, reason="wrong_ticket_type")
        return ScanResponse(valid=False, reason="wrong_ticket_type")

    event_result = await db.execute(select(Event).where(Event.id == ticket.event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        await _log_scan(db, admin, ticket_id=ticket.id, event_id=None, result=ScanResult.INVALID, reason="event_not_found")
        return ScanResponse(valid=False, reason="event_not_found")

    # L'event du JWT et le ticket doivent matcher (cohérence supplémentaire).
    if str(event.id) != claims["evt"]:
        await _log_scan(db, admin, ticket_id=ticket.id, event_id=event.id, result=ScanResult.INVALID, reason="wrong_event")
        return ScanResponse(valid=False, reason="wrong_event")

    # On accepte les scans dès que l'événement est OPEN (arrivées anticipées),
    # LIVE (en cours), voire CLOSED (retardataires) — mais pas DRAFT.
    if event.status == EventStatus.DRAFT.value:
        await _log_scan(db, admin, ticket_id=ticket.id, event_id=event.id, result=ScanResult.INVALID, reason="event_not_open")
        return ScanResponse(valid=False, reason="event_not_open")

    # Double-scan
    if ticket.is_scanned:
        first_scan_by_email = None
        if ticket.scanned_by:
            r = await db.execute(select(Admin.email).where(Admin.id == ticket.scanned_by))
            first_scan_by_email = r.scalar_one_or_none()

        await _log_scan(db, admin, ticket_id=ticket.id, event_id=event.id, result=ScanResult.DUPLICATE, reason="already_scanned")
        return ScanResponse(
            valid=False,
            reason="already_scanned",
            ticket_id=str(ticket.id),
            participant_name=claims.get("pn"),
            first_scan_at=ticket.scanned_at,
            first_scan_by=first_scan_by_email,
        )

    # Order doit être PAID ou MANUAL_VALIDATED
    order_result = await db.execute(select(Order).where(Order.id == ticket.order_id))
    order = order_result.scalar_one_or_none()
    if not order or order.status not in (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value):
        await _log_scan(db, admin, ticket_id=ticket.id, event_id=event.id, result=ScanResult.INVALID, reason="order_not_paid")
        return ScanResponse(valid=False, reason="order_not_paid")

    # Marque comme scanné
    now = datetime.now(timezone.utc)
    ticket.is_scanned = True
    ticket.scanned_at = now
    ticket.scanned_by = admin.id

    # Récupère la formule pour l'affichage (facultatif)
    formula_result = await db.execute(select(Formula).where(Formula.id == ticket.formula_id))
    formula = formula_result.scalar_one_or_none()

    await _log_scan(db, admin, ticket_id=ticket.id, event_id=event.id, result=ScanResult.VALID)

    return ScanResponse(
        valid=True,
        ticket_id=str(ticket.id),
        participant_name=claims.get("pn"),
        formula_name=formula.name if formula else None,
        event_name=event.name,
        scanned_at=now,
    )


# ------------------------------------------------------- GET /tickets/{id}/qr


@router.get("/{ticket_id}/qr")
async def get_ticket_qr(
    ticket_id: str,
    admin: Admin = Depends(require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    """Récupère l'image QR d'un ticket (pour ré-envoi manuel depuis le dashboard admin)."""
    parsed = _safe_uuid(ticket_id)
    if not parsed:
        raise HTTPException(status_code=400, detail="ticket_id invalide")

    result = await db.execute(select(Ticket).where(Ticket.id == parsed))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    if ticket.type != TicketType.QR.value or not ticket.qr_image_url:
        raise HTTPException(status_code=409, detail="Ce ticket n'a pas de QR (billet online ?)")
    return {
        "ticket_id": str(ticket.id),
        "qr_token": ticket.qr_token,
        "qr_image_data_url": ticket.qr_image_url,
    }


# ------------------------------------------------------------ POST /tickets/resend


@router.post("/resend")
@limiter.limit("3/hour")
async def resend_ticket(
    request: Request,
    data: TicketResendRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Re-envoi d'un billet à un acheteur ayant perdu son email/WA."""
    ref_input = data.order_id.strip().lower()
    
    order = None
    participant = None
    event = None
    formula = None

    # Chercher d'abord par UUID complet
    try:
        parsed = uuid.UUID(ref_input)
        result = await db.execute(
            select(Order, Participant, Event, Formula)
            .join(Participant, Participant.id == Order.participant_id)
            .join(Event, Event.id == Order.event_id)
            .join(Formula, Formula.id == Order.formula_id)
            .where(Order.id == parsed)
            .where(Participant.email == data.email)
        )
        row = result.first()
        if row:
            order, participant, event, formula = row
    except ValueError:
        pass

    # Si non trouvé, on cherche avec la référence courte (8 derniers caractères) via les tickets ou la commande
    if not order:
        from sqlalchemy import cast, String
        # Chercher par ticket short ref
        result = await db.execute(
            select(Order, Participant, Event, Formula)
            .join(Ticket, Ticket.order_id == Order.id)
            .join(Participant, Participant.id == Order.participant_id)
            .join(Event, Event.id == Order.event_id)
            .join(Formula, Formula.id == Order.formula_id)
            .where(cast(Ticket.id, String).ilike(f"%{ref_input}"))
            .where(Participant.email == data.email)
        )
        row = result.first()
        if row:
            order, participant, event, formula = row

    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable pour cet email ou cette référence")

    if order.status not in (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value):
        raise HTTPException(
            status_code=409,
            detail=f"Cette commande n'a pas de billet à renvoyer (statut : {order.status})",
        )

    tickets_result = await db.execute(select(Ticket).where(Ticket.order_id == order.id))
    tickets = tickets_result.scalars().all()
    if not tickets:
        raise HTTPException(
            status_code=409,
            detail="Aucun billet trouvé pour cette commande — contactez le support",
        )

    from app.services.ticket_service import ticket_service
    background_tasks.add_task(
        ticket_service.send_tickets_bg,
        str(order.id)
    )

    return {
        "message": f"Renvoi programmé vers {participant.email} et {participant.whatsapp}",
        "tickets_count": len(tickets),
        "channels": ["email", "whatsapp"],
    }


# ------------------------------------------------------------- helpers


def _safe_uuid(value) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError):
        return None


async def _log_scan(
    db: AsyncSession,
    admin: Admin,
    *,
    ticket_id,
    event_id,
    result: ScanResult,
    reason: str | None = None,
):
    """Ajoute une ligne dans scan_logs — silencieux si event_id inconnu (colonne NOT NULL)."""
    if not event_id:
        return
    db.add(
        ScanLog(
            ticket_id=ticket_id,
            event_id=event_id,
            scanned_by=admin.id,
            result=result.value,
            reason=reason,
        )
    )
    await db.flush()
