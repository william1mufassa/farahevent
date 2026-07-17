"""File de livraison des billets — outbox transactionnel.

Une ligne = un billet à livrer sur un canal. Créée DANS LA MÊME TRANSACTION que
l'émission du billet : si la commande ne commit pas, le job n'existe pas ; si
elle commit, le job existe. Aucune fenêtre où l'un existe sans l'autre.

C'est la propriété qui manquait : l'ancien `asyncio.create_task(send_tickets_bg)`
partait AVANT le commit et ouvrait sa propre session — s'il gagnait la course, il
ne voyait aucun billet et sortait en silence. Client payé, rien reçu, aucune trace.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DeliveryJob(Base):
    __tablename__ = "delivery_jobs"
    __table_args__ = (
        # Idempotence structurelle : un seul job par (commande, canal). Une
        # double émission (rejeu de webhook, re-validation manuelle) ne peut pas
        # produire deux envois — c'est la base qui le refuse, pas du code.
        UniqueConstraint("order_id", "channel", name="uq_delivery_jobs_order_channel"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # email | whatsapp
    # pending → sent | failed. `failed` = dead letter : plus de tentative
    # automatique, il faut une action humaine (l'admin le voit).
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Quand retenter. Le worker ne prend que les jobs dus : c'est ce champ qui
    # porte le backoff, pas un sleep dans le process.
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    order = relationship("Order")
