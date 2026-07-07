import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ManualPayment(Base):
    """Preuve de paiement soumise par un acheteur international (WU/RIA/MoneyGram)."""
    __tablename__ = "manual_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    operator: Mapped[str] = mapped_column(String(30), nullable=False)  # western_union/ria/moneygram/other
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    sender_country: Mapped[str] = mapped_column(String(100), nullable=False)
    receipt_image_url: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/validated/rejected
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    validated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True
    )
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    order = relationship("Order", back_populates="manual_payment")
    validator = relationship("Admin", back_populates="validated_manual_payments")
