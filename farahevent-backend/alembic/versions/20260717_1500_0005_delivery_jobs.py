"""File de livraison des billets (outbox transactionnel) — T3.10.

Avant : la livraison partait en fire-and-forget, sans retry. Un client payé + un
provider indisponible 30 secondes = billet jamais reçu, sans trace.

`ondelete=CASCADE` sur order_id : purger une commande (reset d'événement) ne doit
pas laisser un job orphelin qui échouerait indéfiniment.

Revision ID: 0005_delivery_jobs
Revises: 0004_live_links_sent
Create Date: 2026-07-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_delivery_jobs"
down_revision: Union[str, None] = "0004_live_links_sent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "delivery_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Idempotence structurelle : un seul job par (commande, canal). Un rejeu
        # de webhook ne peut pas produire deux envois — c'est la base qui refuse.
        sa.UniqueConstraint("order_id", "channel", name="uq_delivery_jobs_order_channel"),
    )
    op.create_index("ix_delivery_jobs_order_id", "delivery_jobs", ["order_id"])
    op.create_index("ix_delivery_jobs_status", "delivery_jobs", ["status"])
    # Index de la requête du worker : WHERE status='pending' AND next_attempt_at <= now
    # ORDER BY next_attempt_at. Sans lui, chaque tour scanne toute la table.
    op.create_index(
        "ix_delivery_jobs_due", "delivery_jobs", ["status", "next_attempt_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_delivery_jobs_due", table_name="delivery_jobs")
    op.drop_index("ix_delivery_jobs_status", table_name="delivery_jobs")
    op.drop_index("ix_delivery_jobs_order_id", table_name="delivery_jobs")
    op.drop_table("delivery_jobs")
