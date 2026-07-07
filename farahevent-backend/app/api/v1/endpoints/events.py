"""Endpoints publics des événements — pas d'auth requise."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.chatbot_faq import ChatbotFaq
from app.models.event import Event
from app.models.formula import Formula
from app.models.payment_config import PaymentConfig
from app.models.enums import EventStatus
from app.schemas.event import (
    EventDetailPublic,
    EventListItem,
    FormulaPublic,
    PaymentConfigPublic,
)

router = APIRouter()

_PUBLIC_STATUSES = {EventStatus.OPEN.value, EventStatus.LIVE.value, EventStatus.CLOSED.value}


@router.get("/", response_model=list[EventListItem])
async def list_events(db: AsyncSession = Depends(get_db)):
    """Liste publique des événements ouverts / en live / clos."""
    result = await db.execute(
        select(Event)
        .where(Event.is_deleted.is_(False))
        .where(Event.status.in_(_PUBLIC_STATUSES))
        .order_by(Event.date.asc())
    )
    events = result.scalars().all()
    return [_to_list_item(e) for e in events]


@router.get("/{slug}", response_model=EventDetailPublic)
async def get_event_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Détail public d'un événement (par slug) + formules actives + config paiement."""
    event = await _load_public_event(db, slug)

    formulas_result = await db.execute(
        select(Formula)
        .where(Formula.event_id == event.id)
        .where(Formula.is_active.is_(True))
        .order_by(Formula.sort_order.asc(), Formula.price.asc())
    )
    formulas = formulas_result.scalars().all()

    cfg_result = await db.execute(
        select(PaymentConfig).where(PaymentConfig.event_id == event.id)
    )
    cfg = cfg_result.scalar_one_or_none()

    return EventDetailPublic(
        **_to_list_item(event).model_dump(),
        description=event.description,
        status=event.status,
        formulas=[_to_formula_public(f) for f in formulas],
        payment_config=_to_payment_config_public(cfg) if cfg else None,
    )


@router.get("/{slug}/faqs")
async def list_event_faqs_public(slug: str, db: AsyncSession = Depends(get_db)):
    """FAQ chatbot publiques d'un événement (widget public)."""
    event = await _load_public_event(db, slug)
    r = await db.execute(
        select(ChatbotFaq)
        .where(ChatbotFaq.event_id == event.id)
        .where(ChatbotFaq.is_active.is_(True))
        .order_by(ChatbotFaq.sort_order.asc())
    )
    return [
        {"id": str(f.id), "question": f.question, "answer": f.answer}
        for f in r.scalars().all()
    ]


@router.get("/{slug}/payment-config", response_model=PaymentConfigPublic)
async def get_event_payment_config(slug: str, db: AsyncSession = Depends(get_db)):
    """Instructions de paiement (utilisé par la page de paiement manuel côté front)."""
    event = await _load_public_event(db, slug)
    cfg_result = await db.execute(
        select(PaymentConfig).where(PaymentConfig.event_id == event.id)
    )
    cfg = cfg_result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuration paiement absente")
    return _to_payment_config_public(cfg)


# ---------------------------------------------------------------------- helpers


async def _load_public_event(db: AsyncSession, slug: str) -> Event:
    result = await db.execute(
        select(Event)
        .where(Event.slug == slug)
        .where(Event.is_deleted.is_(False))
    )
    event = result.scalar_one_or_none()
    if not event or event.status not in _PUBLIC_STATUSES:
        raise HTTPException(status_code=404, detail="Événement non trouvé ou non ouvert")
    return event


def _to_list_item(e: Event) -> EventListItem:
    return EventListItem(
        id=str(e.id),
        slug=e.slug,
        name=e.name,
        mode=e.mode,
        template=e.template,
        date=e.date,
        end_time=e.end_time,
        location=e.location,
        venue_city=e.venue_city,
        cover_image_url=e.cover_image_url,
        is_featured=e.is_featured,
    )


def _to_formula_public(f: Formula) -> FormulaPublic:
    return FormulaPublic(
        id=str(f.id),
        name=f.name,
        description=f.description,
        advantages=f.advantages,
        price=float(f.price),
        currency=f.currency,
        channel=f.channel,
        available_quantity=f.available_quantity,
        is_sold_out=f.is_sold_out,
        sort_order=f.sort_order,
    )


def _to_payment_config_public(cfg: PaymentConfig) -> PaymentConfigPublic:
    return PaymentConfigPublic(
        beneficiary_name=cfg.beneficiary_name,
        beneficiary_country=cfg.beneficiary_country,
        beneficiary_city=cfg.beneficiary_city,
        amount_fcfa=float(cfg.amount_fcfa) if cfg.amount_fcfa is not None else None,
        amount_eur=float(cfg.amount_eur) if cfg.amount_eur is not None else None,
        amount_usd=float(cfg.amount_usd) if cfg.amount_usd is not None else None,
        instructions_text=cfg.instructions_text,
        is_digital_enabled=cfg.is_digital_enabled,
        is_manual_enabled=cfg.is_manual_enabled,
    )
