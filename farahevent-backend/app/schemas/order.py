from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.schemas.participant import ParticipantInput


class OrderCreateRequest(BaseModel):
    """Requête publique de création de commande — anonyme."""

    event_id: str
    formula_id: str
    participant: ParticipantInput
    # digital : PayDunya (Sprint 5) — laisser vide pour laisser le provider décider
    # manual  : l'acheteur envoie sa preuve via /orders/{id}/manual-payment
    payment_mode: str = Field(..., pattern=r"^(digital|manual)$")
    payment_method_label: str | None = Field(
        None, max_length=50, description="ex: wave/orange_money/mtn/card"
    )


class OrderCreateResponse(BaseModel):
    order_id: str
    status: str
    amount: float
    currency: str
    payment_mode: str
    # digital : URL vers laquelle rediriger l'acheteur (fourni par PayDunya en S5)
    checkout_url: str | None = None
    # manual : URL frontend d'upload de preuve (le frontend saura router)
    manual_upload_hint: str | None = None


class OrderPublicStatus(BaseModel):
    id: str
    status: str
    amount: float
    currency: str
    payment_mode: str | None
    payment_method_label: str | None
    event: dict
    formula: dict
    manual_payment_status: str | None = None
    created_at: datetime


class TicketResendRequest(BaseModel):
    email: EmailStr
    order_id: str
