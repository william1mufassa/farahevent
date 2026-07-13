import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Admin(Base):
    """Utilisateur administrateur — 4 rôles selon le cahier."""
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="agent")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    two_factor_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Secret 2FA en attente de confirmation : posé par /setup, promu vers
    # two_factor_secret uniquement après un premier OTP validé (/verify). Tant
    # qu'il vit ici, il n'affecte pas le login → pas de verrouillage (audit §C.1).
    two_factor_secret_temp: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    events = relationship("Event", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="admin")
    validated_manual_payments = relationship("ManualPayment", back_populates="validator")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
