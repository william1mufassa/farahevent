import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Participant(Base):
    """Acheteur de billet — pas de mot de passe, identifié via email + event."""
    __tablename__ = "participants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    whatsapp: Mapped[str] = mapped_column(String(30), nullable=False)  # avec indicatif pays
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ticket_delivery_pref: Mapped[str] = mapped_column(String(20), default="both")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    orders = relationship("Order", back_populates="participant")
    tickets = relationship("Ticket", back_populates="participant")

    __table_args__ = (
        Index("ix_participants_email", "email"),
        Index("ix_participants_whatsapp", "whatsapp"),
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
