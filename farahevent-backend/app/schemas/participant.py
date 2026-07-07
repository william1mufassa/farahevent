import re
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import TicketDeliveryPref


class ParticipantInput(BaseModel):
    """Données participant fournies dans le formulaire d'achat public."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    whatsapp: str = Field(..., min_length=6, max_length=30)
    country: str = Field(..., min_length=2, max_length=100)
    city: str | None = Field(None, max_length=100)
    ticket_delivery_pref: TicketDeliveryPref = TicketDeliveryPref.BOTH

    @field_validator("whatsapp")
    @classmethod
    def _normalize_whatsapp(cls, v: str) -> str:
        # Format international attendu : "+225XXXXXXXX" ou "225XXXXXXXX"
        stripped = re.sub(r"[\s\-\(\)\.]", "", v)
        if not re.fullmatch(r"\+?\d{8,15}", stripped):
            raise ValueError(
                "Numéro WhatsApp invalide — format international attendu (ex: +2250700000000)"
            )
        return stripped if stripped.startswith("+") else f"+{stripped}"
