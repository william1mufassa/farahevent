"""Schémas admin pour toutes les ressources event-scoped."""
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.enums import (
    AutomationChannel,
    EmailTrigger,
    EventMode,
    EventStatus,
    EventTemplate,
    FormulaChannel,
    WhatsappGroupCategory,
)


# --------------------------------------------------------------------- Event


class EventCreate(BaseModel):
    slug: str = Field(..., min_length=3, max_length=200, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    mode: EventMode = EventMode.PRESENTIEL
    template: EventTemplate = EventTemplate.A
    date: datetime
    end_time: datetime | None = None
    location: str | None = Field(None, max_length=255)
    venue_city: str | None = Field(None, max_length=100)
    max_capacity: int | None = Field(None, ge=1)
    cover_image_url: str | None = None


class EventUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    mode: EventMode | None = None
    template: EventTemplate | None = None
    date: datetime | None = None
    end_time: datetime | None = None
    location: str | None = Field(None, max_length=255)
    venue_city: str | None = Field(None, max_length=100)
    max_capacity: int | None = Field(None, ge=1)
    cover_image_url: str | None = None
    is_featured: bool | None = None
    stream_key: str | None = None
    stream_hls_url: str | None = None


class EventStatusUpdate(BaseModel):
    status: EventStatus


class EventAdminOut(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None
    mode: str
    status: str
    template: str
    date: datetime
    end_time: datetime | None
    location: str | None
    venue_city: str | None
    max_capacity: int | None
    cover_image_url: str | None
    is_featured: bool
    is_deleted: bool
    created_at: datetime
    stream_key: str | None = None
    stream_hls_url: str | None = None


# --------------------------------------------------------------------- Formula


class FormulaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    advantages: str | None = None
    price: float = Field(..., ge=0)
    currency: str = Field("XOF", min_length=3, max_length=3)
    channel: FormulaChannel = FormulaChannel.PRESENTIEL
    stock: int | None = Field(None, ge=0)
    sort_order: int = 0


class FormulaUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    advantages: str | None = None
    price: float | None = Field(None, ge=0)
    channel: FormulaChannel | None = None
    stock: int | None = Field(None, ge=0)
    is_active: bool | None = None
    sort_order: int | None = None


class FormulaAdminOut(BaseModel):
    id: str
    event_id: str
    name: str
    description: str | None
    advantages: str | None
    price: float
    currency: str
    channel: str
    stock: int | None
    sold_quantity: int
    is_active: bool
    sort_order: int


# ---------------------------------------------------------------- Event Content


class EventContentUpsert(BaseModel):
    entries: dict[str, str | None] = Field(
        ..., description="Dict clé→valeur ; valeur None = suppression."
    )


class EventContentOut(BaseModel):
    entries: dict[str, str | None]


# ---------------------------------------------------------------- Payment Config


class PaymentConfigUpsert(BaseModel):
    beneficiary_name: str | None = None
    beneficiary_country: str | None = None
    beneficiary_city: str | None = None
    amount_fcfa: float | None = Field(None, ge=0)
    amount_eur: float | None = Field(None, ge=0)
    amount_usd: float | None = Field(None, ge=0)
    instructions_text: str | None = None
    is_digital_enabled: bool | None = None
    is_manual_enabled: bool | None = None


# ---------------------------------------------------------------- WhatsappGroup


class WhatsappGroupCreate(BaseModel):
    category: WhatsappGroupCategory
    invite_link: str = Field(..., min_length=10)
    max_capacity: int = Field(900, ge=1, le=2048)
    sort_order: int = 0


class WhatsappGroupUpdate(BaseModel):
    invite_link: str | None = None
    max_capacity: int | None = Field(None, ge=1, le=2048)
    sort_order: int | None = None
    is_active: bool | None = None


class WhatsappGroupOut(BaseModel):
    id: str
    event_id: str
    category: str
    invite_link: str
    max_capacity: int
    current_count: int
    sort_order: int
    is_active: bool
    is_full: bool


# ---------------------------------------------------------------- ChatbotFaq


class ChatbotFaqCreate(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    sort_order: int = 0


class ChatbotFaqUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ChatbotFaqOut(BaseModel):
    id: str
    event_id: str
    question: str
    answer: str
    sort_order: int
    is_active: bool


# ---------------------------------------------------------------- EmailAutomation


class EmailAutomationCreate(BaseModel):
    trigger_type: EmailTrigger
    channel: AutomationChannel = AutomationChannel.BOTH
    template_id: str | None = None
    relative_offset_minutes: int | None = None


class EmailAutomationUpdate(BaseModel):
    channel: AutomationChannel | None = None
    template_id: str | None = None
    relative_offset_minutes: int | None = None
    is_active: bool | None = None


class EmailAutomationOut(BaseModel):
    id: str
    event_id: str
    trigger_type: str
    channel: str
    template_id: str | None
    relative_offset_minutes: int | None
    is_active: bool
