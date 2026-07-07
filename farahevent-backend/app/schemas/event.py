from datetime import datetime
from pydantic import BaseModel


class FormulaPublic(BaseModel):
    id: str
    name: str
    description: str | None
    advantages: str | None
    price: float
    currency: str
    channel: str
    available_quantity: int | None  # None = illimité
    is_sold_out: bool
    sort_order: int


class PaymentConfigPublic(BaseModel):
    beneficiary_name: str | None
    beneficiary_country: str | None
    beneficiary_city: str | None
    amount_fcfa: float | None
    amount_eur: float | None
    amount_usd: float | None
    instructions_text: str | None
    is_digital_enabled: bool
    is_manual_enabled: bool


class EventListItem(BaseModel):
    id: str
    slug: str
    name: str
    mode: str
    template: str
    date: datetime
    end_time: datetime | None
    location: str | None
    venue_city: str | None
    cover_image_url: str | None
    is_featured: bool


class EventDetailPublic(EventListItem):
    description: str | None
    status: str
    formulas: list[FormulaPublic]
    payment_config: PaymentConfigPublic | None
