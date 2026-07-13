"""Brouillon éditable d'un événement pour le CMS admin (CONCEPTION_FRONTEND §10.3).

Contrats consommés par le frontend (getEventDraft / saveEventDraft) :
- GET   /admin/events/{event_id}/draft        → EventDraft (8 sections)
- PATCH /admin/events/{event_id}/{section}     → sauvegarde d'une section

Stockage : chaque section est un blob JSON dans `event_content` sous la clé
`draft:{section}` (round-trip fidèle, agnostique au shape front). La section
`general` est en plus miroitée vers les colonnes de la table `events` pour que la
liste admin et l'endpoint public restent cohérents.

IMPORTANT (routage) : la route PATCH /{event_id}/{section} est générique ; ce
routeur DOIT être inclus APRÈS admin_events (qui possède /{event_id}/status),
sinon la garde de transition de statut serait court-circuitée.
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.event import Event
from app.models.event_content import EventContent
from app.services.audit_service import audit_service
from app.services.revalidate_service import revalidate_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)

_SECTIONS = ("general", "content", "design", "speakers", "programme", "partners", "options", "automations")
_KEY_PREFIX = "draft:"
_DEFAULT_COLORS = {
    "primary": "#E63946",
    "secondary": "#457B9D",
    "bg": "#FFFFFF",
    "bg_mode": "light",
    "text": "#1D1D1D",
}


async def _load_event(db: AsyncSession, event_id: str) -> Event:
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")
    e = (await db.execute(select(Event).where(Event.id == parsed))).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return e


def _default_section(section: str, e: Event):
    """Valeurs par défaut d'une section quand aucun brouillon n'a encore été sauvé."""
    if section == "general":
        d = e.date
        return {
            "name": {"fr": e.name, "en": None},
            "slug": e.slug,
            "date": d.date().isoformat() if d else "",
            "start_time": d.strftime("%H:%M") if d else "",
            "end_time": e.end_time.strftime("%H:%M") if e.end_time else None,
            "location": e.location,
            "city": e.venue_city,
            "mode": e.mode,
            "status": e.status,
            "max_capacity": e.max_capacity,
        }
    if section == "content":
        return {
            "hero_image_url": e.cover_image_url or "",
            "description": {"fr": "", "en": None},
            "tagline": {"fr": "", "en": None},
            "cta_presentiel": {"fr": "", "en": None},
            "cta_online": {"fr": "", "en": None},
        }
    if section == "design":
        return {"template": e.template, "colors": _DEFAULT_COLORS}
    if section == "options":
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
    # speakers / programme / partners / automations
    return []


def _apply_general_to_event(e: Event, data: dict) -> None:
    """Miroite les champs primitifs de la section general vers la table events."""
    if not isinstance(data, dict):
        return
    name = data.get("name")
    if isinstance(name, dict) and name.get("fr"):
        e.name = name["fr"]
    if data.get("slug"):
        e.slug = data["slug"]
    if "location" in data:
        e.location = data["location"]
    if "city" in data:
        e.venue_city = data["city"]
    if data.get("mode"):
        e.mode = data["mode"]
    if data.get("status"):
        e.status = data["status"]
    if "max_capacity" in data:
        e.max_capacity = data["max_capacity"]
    date_s, start_s, end_s = data.get("date"), data.get("start_time"), data.get("end_time")
    if date_s and start_s:
        try:
            e.date = datetime.fromisoformat(f"{date_s}T{start_s}").replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    if date_s and end_s:
        try:
            e.end_time = datetime.fromisoformat(f"{date_s}T{end_s}").replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    elif end_s is None and "end_time" in data:
        e.end_time = None


@router.get("/events/{event_id}/draft")
async def get_event_draft(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    event = await _load_event(db, event_id)
    rows = (
        await db.execute(select(EventContent).where(EventContent.event_id == event.id))
    ).scalars().all()
    stored = {}
    for c in rows:
        if c.key and c.key.startswith(_KEY_PREFIX):
            try:
                stored[c.key[len(_KEY_PREFIX):]] = json.loads(c.value) if c.value else None
            except (ValueError, TypeError):
                pass

    draft = {"id": str(event.id)}
    for section in _SECTIONS:
        val = stored.get(section)
        draft[section] = val if val is not None else _default_section(section, event)
    return draft


@router.patch("/events/{event_id}/{section}")
async def save_event_section(
    event_id: str,
    section: str,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    if section not in _SECTIONS:
        raise HTTPException(status_code=404, detail=f"Section inconnue : {section}")
    event = await _load_event(db, event_id)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Corps JSON invalide")

    if section == "general":
        _apply_general_to_event(event, data)

    key = f"{_KEY_PREFIX}{section}"
    existing = (
        await db.execute(
            select(EventContent).where(
                EventContent.event_id == event.id, EventContent.key == key
            )
        )
    ).scalar_one_or_none()
    payload = json.dumps(data, ensure_ascii=False)
    if existing:
        existing.value = payload
    else:
        db.add(EventContent(event_id=event.id, key=key, value=payload))

    await audit_service.log(
        db, admin=admin, action="event_draft.save",
        resource_type="event", resource_id=str(event.id),
        payload={"section": section}, request=request,
    )
    # Invalide le cache ISR de la landing (le contenu vient de changer) — suivi ISR.
    await revalidate_service.revalidate_event(event.slug)
    return {"ok": True, "section": section}
