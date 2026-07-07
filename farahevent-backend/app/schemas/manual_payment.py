from datetime import datetime
from pydantic import BaseModel, Field


class ManualPaymentOut(BaseModel):
    id: str
    order_id: str
    operator: str
    sender_name: str
    sender_country: str
    receipt_image_url: str
    status: str
    rejection_reason: str | None
    validated_by: str | None
    validated_at: datetime | None
    created_at: datetime
    order: dict
    participant: dict
    event: dict
    formula: dict


class ManualPaymentRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class ManualPaymentValidateResponse(BaseModel):
    order_id: str
    status: str
    tickets_generated: int
