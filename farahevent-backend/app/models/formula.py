import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Text, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Formula(Base):
    """Formule tarifaire d'un événement (Standard, VIP, Standard Online...)."""
    __tablename__ = "formulas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    advantages: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    channel: Mapped[str] = mapped_column(String(20), default="presentiel")  # presentiel/online/both
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)  # NULL = illimité
    sold_quantity: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event = relationship("Event", back_populates="formulas")
    orders = relationship("Order", back_populates="formula")
    tickets = relationship("Ticket", back_populates="formula")

    __table_args__ = (
        # Lookups fréquents par événement (formules publiques + admin) — audit §D
        Index("ix_formulas_event_id", "event_id"),
    )

    @property
    def available_quantity(self) -> int | None:
        if self.stock is None:
            return None
        return self.stock - self.sold_quantity

    @property
    def is_sold_out(self) -> bool:
        return self.stock is not None and self.sold_quantity >= self.stock
