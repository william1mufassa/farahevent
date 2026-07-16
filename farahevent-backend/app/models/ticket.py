import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Ticket(Base):
    """Billet émis après paiement validé. Peut être présentiel (QR) ou online (live_link)."""
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )
    formula_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("formulas.id"), nullable=False
    )

    type: Mapped[str] = mapped_column(String(20), default="qr")  # qr / live_link

    # QR (présentiel) — JWT signé, unique
    qr_token: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    qr_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scanned_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True
    )

    # Live (online) — JWT signé, unique
    live_token: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)

    # Tracking de l'envoi (accusé de réception)
    email_delivery_status: Mapped[str] = mapped_column(String(20), default="pending") # pending, sent, failed, not_requested
    whatsapp_delivery_status: Mapped[str] = mapped_column(String(20), default="pending") # pending, sent, failed, not_requested
    delivery_error_log: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    order = relationship("Order", back_populates="tickets")
    participant = relationship("Participant", back_populates="tickets")
    event = relationship("Event", back_populates="tickets")
    formula = relationship("Formula", back_populates="tickets")
    scan_logs = relationship("ScanLog", back_populates="ticket")

    __table_args__ = (
        # Lookups fréquents par commande (génération, resend, scan) — audit §D
        Index("ix_tickets_order_id", "order_id"),
    )
