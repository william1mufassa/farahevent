"""Endpoints publics des événements — pas d'auth requise."""
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.chatbot_faq import ChatbotFaq
from app.models.event import Event
from app.models.event_content import EventContent
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
        .where(Event.is_deleted == False)
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


_DEFAULT_COLORS = {
    "primary": "#E63946",
    "secondary": "#457B9D",
    "bg": "#FFFFFF",
    "bg_mode": "light",
    "text": "#1D1D1D",
}


def _bilingual(fr, en=None):
    return {"fr": fr or "", "en": en}


def _default_options():
    return {
        "show_tickets_counter": True,
        "show_countdown": True,
        "show_speakers": True,
        "show_live_qa": False,
        "digital_enabled": True,
        "manual_enabled": False,
        "chatbot_enabled": True,
        "marquee_text": None,
    }


async def _load_draft_blobs(db: AsyncSession, event_id) -> dict:
    """Sections CMS stockées en JSON par l'admin (event_content['draft:{section}'])."""
    rows = (
        await db.execute(select(EventContent).where(EventContent.event_id == event_id))
    ).scalars().all()
    blobs = {}
    for c in rows:
        if c.key and c.key.startswith("draft:") and c.value:
            try:
                blobs[c.key[len("draft:"):]] = json.loads(c.value)
            except (ValueError, TypeError):
                pass
    return blobs


@router.get("/{slug}/config")
async def get_event_public_config(slug: str, db: AsyncSession = Depends(get_db)):
    """Config publique complète d'un événement (EventConfig) — alimente la landing
    des 4 templates. Assemble : infos event + blobs CMS (design/content/speakers/
    programme/partners/options) + formules réelles + config paiement + FAQ."""
    event = await _load_public_event(db, slug)
    blobs = await _load_draft_blobs(db, event.id)
    general = blobs.get("general") or {}
    content_blob = blobs.get("content") or {}
    design_blob = blobs.get("design") or {}

    formulas_rows = (
        await db.execute(
            select(Formula)
            .where(Formula.event_id == event.id)
            .where(Formula.is_active.is_(True))
            .order_by(Formula.sort_order.asc(), Formula.price.asc())
        )
    ).scalars().all()
    cfg = (
        await db.execute(select(PaymentConfig).where(PaymentConfig.event_id == event.id))
    ).scalar_one_or_none()
    faqs_rows = (
        await db.execute(
            select(ChatbotFaq)
            .where(ChatbotFaq.event_id == event.id)
            .where(ChatbotFaq.is_active.is_(True))
            .order_by(ChatbotFaq.sort_order.asc())
        )
    ).scalars().all()

    options = blobs.get("options") or _default_options()
    if cfg:  # payment_config = source de vérité pour l'activation digital/manuel
        options["digital_enabled"] = cfg.is_digital_enabled
        options["manual_enabled"] = cfg.is_manual_enabled
    show_counter = options.get("show_tickets_counter", True)

    d = event.date
    event_info = {
        "id": str(event.id),
        "slug": event.slug,
        "name": general.get("name") or _bilingual(event.name),
        "date": general.get("date") or (d.date().isoformat() if d else ""),
        "start_time": general.get("start_time") or (d.strftime("%H:%M") if d else ""),
        "end_time": general.get("end_time")
        if "end_time" in general
        else (event.end_time.strftime("%H:%M") if event.end_time else None),
        "location": general.get("location", event.location),
        "city": general.get("city", event.venue_city),
        "mode": event.mode,
        "status": event.status,
        "logo_url": general.get("logo_url"),
    }

    formulas = []
    for f in formulas_rows:
        advantages = (
            [_bilingual(line.strip()) for line in f.advantages.splitlines() if line.strip()]
            if f.advantages
            else []
        )
        formulas.append(
            {
                "id": str(f.id),
                "name": _bilingual(f.name),
                "description": _bilingual(f.description),
                "advantages": advantages,
                "price": float(f.price),
                "currency": f.currency,
                "channel": f.channel,
                "remaining": f.available_quantity if show_counter else None,
                "is_sold_out": f.is_sold_out,
                "is_featured": False,
                "sort_order": f.sort_order,
            }
        )

    payment_manual = None
    if cfg and cfg.is_manual_enabled:
        payment_manual = {
            "beneficiary_name": cfg.beneficiary_name,
            "beneficiary_country": cfg.beneficiary_country,
            "beneficiary_city": cfg.beneficiary_city,
            "amount_eur": float(cfg.amount_eur) if cfg.amount_eur is not None else None,
            "amount_usd": float(cfg.amount_usd) if cfg.amount_usd is not None else None,
            "instructions": _bilingual(cfg.instructions_text) if cfg.instructions_text else None,
        }

    return {
        "event": event_info,
        "design": {
            "template": design_blob.get("template") or event.template,
            "colors": design_blob.get("colors") or _DEFAULT_COLORS,
        },
        "content": {
            "hero_image_url": content_blob.get("hero_image_url") or event.cover_image_url or "",
            "hero_video_url": content_blob.get("hero_video_url"),
            "description": content_blob.get("description") or _bilingual(event.description),
            "tagline": content_blob.get("tagline"),
            "teaser_video_url": content_blob.get("teaser_video_url"),
            "cta_presentiel": content_blob.get("cta_presentiel") or _bilingual("Participer en présentiel"),
            "cta_online": content_blob.get("cta_online") or _bilingual("Suivre en ligne"),
        },
        "formulas": formulas,
        "speakers": blobs.get("speakers") or [],
        "programme": blobs.get("programme") or [],
        "stats": blobs.get("stats") or [],
        "faqs": [
            {"id": str(x.id), "question": _bilingual(x.question), "answer": _bilingual(x.answer)}
            for x in faqs_rows
        ],
        "partners": blobs.get("partners") or [],
        "options": options,
        "payment_manual": payment_manual,
        "footer": blobs.get("footer")
        or {
            "about": _bilingual(""),
            "contact_email": None,
            "contact_whatsapp": None,
            "address": None,
            "socials": [],
        },
        "support": blobs.get("support")
        or {"service_name": "Support FarahEvent", "whatsapp_number": ""},
        "is_live": event.status == EventStatus.LIVE.value,
    }


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
        .where(Event.is_deleted == False)
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
