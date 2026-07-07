import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PaymentConfig(Base):
    """Configuration paiement d'un événement : instructions manuel + flags digital/manuel."""
    __tablename__ = "payment_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Bénéficiaire pour transferts internationaux
    beneficiary_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    beneficiary_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    beneficiary_city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    amount_fcfa: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    amount_eur: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    amount_usd: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    instructions_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_digital_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_manual_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    event = relationship("Event", back_populates="payment_config")
