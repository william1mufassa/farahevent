import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class Order(Base):
    """Commande = achat d'un billet. 7 statuts possibles (voir enums.OrderStatus)."""
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )
    formula_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("formulas.id"), nullable=False
    )
    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    status: Mapped[str] = mapped_column(String(20), default="PENDING")

    # Provider-agnostic (PayDunya, autres, ou "manual")
    payment_provider: Mapped[str | None] = mapped_column(String(30), nullable=True)
    payment_provider_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_provider_checkout_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    payment_method_label: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # ex: wave / orange_money / mtn / card / western_union...

    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    event = relationship("Event", back_populates="orders")
    formula = relationship("Formula", back_populates="orders")
    participant = relationship("Participant", back_populates="orders")
    tickets = relationship("Ticket", back_populates="order")
    manual_payment = relationship(
        "ManualPayment", back_populates="order", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_orders_event_status", "event_id", "status"),
        Index("ix_orders_created_at", "created_at"),
    )
