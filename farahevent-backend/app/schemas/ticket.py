from datetime import datetime
from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    qr_token: str = Field(..., description="Contenu brut du QR Code scanné (JWT signé)")


class ScanResponse(BaseModel):
    """Résultat d'un scan. Structure stable, consommée par l'app de scan mobile."""
    valid: bool
    reason: str | None = None  # invalid_token / ticket_not_found / already_scanned / wrong_event / event_not_live / wrong_ticket_type
    ticket_id: str | None = None
    participant_name: str | None = None
    formula_name: str | None = None
    event_name: str | None = None
    scanned_at: datetime | None = None
    first_scan_at: datetime | None = None
    first_scan_by: str | None = None
