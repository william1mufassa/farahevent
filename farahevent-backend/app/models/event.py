import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="presentiel")  # presentiel/online/hybrid
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/open/live/closed
    template: Mapped[str] = mapped_column(String(1), default="A")  # A/B

    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    venue_city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    max_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)  # soft delete

    # Streaming (phase 5 — nullable pour l'instant)
    stream_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    stream_hls_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    creator = relationship("Admin", back_populates="events")
    formulas = relationship("Formula", back_populates="event", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="event")
    tickets = relationship("Ticket", back_populates="event")
    payment_config = relationship(
        "PaymentConfig", back_populates="event", uselist=False, cascade="all, delete-orphan"
    )
    contents = relationship("EventContent", back_populates="event", cascade="all, delete-orphan")
    whatsapp_groups = relationship(
        "WhatsappGroup", back_populates="event", cascade="all, delete-orphan"
    )
    chatbot_faqs = relationship(
        "ChatbotFaq", back_populates="event", cascade="all, delete-orphan"
    )
    email_automations = relationship(
        "EmailAutomation", back_populates="event", cascade="all, delete-orphan"
    )
    scan_logs = relationship("ScanLog", back_populates="event")
