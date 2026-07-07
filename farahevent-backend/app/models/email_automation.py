import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmailAutomation(Base):
    """Configuration des envois automatiques par événement (n8n consomme cette table)."""
    __tablename__ = "email_automations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    trigger_type: Mapped[str] = mapped_column(String(30), nullable=False)  # cf. enums.EmailTrigger
    channel: Mapped[str] = mapped_column(String(20), default="both")  # email/whatsapp/both
    template_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Offset en minutes appliqué à la date de début de l'événement.
    # Négatif = avant (J-7 = -10080), positif = après (J+1 = 1440).
    # NULL = envoi déclenché par événement métier (pas temporel).
    relative_offset_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event = relationship("Event", back_populates="email_automations")
