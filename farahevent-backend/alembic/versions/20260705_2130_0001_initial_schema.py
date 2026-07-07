"""initial_schema — 14 tables conformes au cahier v2.0

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-05 21:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # admins
    # ------------------------------------------------------------------
    op.create_table(
        "admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="agent"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("two_factor_secret", sa.String(64), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # participants
    # ------------------------------------------------------------------
    op.create_table(
        "participants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("whatsapp", sa.String(30), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("ticket_delivery_pref", sa.String(20), nullable=False, server_default="both"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_participants_email", "participants", ["email"])
    op.create_index("ix_participants_whatsapp", "participants", ["whatsapp"])

    # ------------------------------------------------------------------
    # events
    # ------------------------------------------------------------------
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("mode", sa.String(20), nullable=False, server_default="presentiel"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("template", sa.String(1), nullable=False, server_default="A"),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("venue_city", sa.String(100), nullable=True),
        sa.Column("max_capacity", sa.Integer, nullable=True),
        sa.Column("cover_image_url", sa.Text, nullable=True),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("stream_key", sa.String(255), nullable=True, unique=True),
        sa.Column("stream_hls_url", sa.Text, nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("admins.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # formulas
    # ------------------------------------------------------------------
    op.create_table(
        "formulas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("advantages", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="XOF"),
        sa.Column("channel", sa.String(20), nullable=False, server_default="presentiel"),
        sa.Column("stock", sa.Integer, nullable=True),
        sa.Column("sold_quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # payment_config
    # ------------------------------------------------------------------
    op.create_table(
        "payment_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("beneficiary_name", sa.String(200), nullable=True),
        sa.Column("beneficiary_country", sa.String(100), nullable=True),
        sa.Column("beneficiary_city", sa.String(100), nullable=True),
        sa.Column("amount_fcfa", sa.Numeric(10, 2), nullable=True),
        sa.Column("amount_eur", sa.Numeric(10, 2), nullable=True),
        sa.Column("amount_usd", sa.Numeric(10, 2), nullable=True),
        sa.Column("instructions_text", sa.Text, nullable=True),
        sa.Column("is_digital_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_manual_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # event_content (CMS)
    # ------------------------------------------------------------------
    op.create_table(
        "event_content",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.Text, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", "key", name="uq_event_content_key"),
    )

    # ------------------------------------------------------------------
    # whatsapp_groups
    # ------------------------------------------------------------------
    op.create_table(
        "whatsapp_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("invite_link", sa.Text, nullable=False),
        sa.Column("max_capacity", sa.Integer, nullable=False, server_default="900"),
        sa.Column("current_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # chatbot_faqs
    # ------------------------------------------------------------------
    op.create_table(
        "chatbot_faqs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # email_automations
    # ------------------------------------------------------------------
    op.create_table(
        "email_automations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("trigger_type", sa.String(30), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False, server_default="both"),
        sa.Column("template_id", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("relative_offset_minutes", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # orders
    # ------------------------------------------------------------------
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("formula_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("formulas.id"), nullable=False),
        sa.Column(
            "participant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("participants.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="XOF"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("payment_provider", sa.String(30), nullable=True),
        sa.Column("payment_provider_ref", sa.String(255), nullable=True),
        sa.Column("payment_provider_checkout_id", sa.String(255), nullable=True, unique=True),
        sa.Column("payment_method_label", sa.String(50), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_orders_event_status", "orders", ["event_id", "status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])

    # ------------------------------------------------------------------
    # tickets
    # ------------------------------------------------------------------
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column(
            "participant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("participants.id"),
            nullable=False,
        ),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("formula_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("formulas.id"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False, server_default="qr"),
        sa.Column("qr_token", sa.Text, nullable=True, unique=True),
        sa.Column("qr_image_url", sa.Text, nullable=True),
        sa.Column("is_scanned", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scanned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("live_token", sa.Text, nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # manual_payments
    # ------------------------------------------------------------------
    op.create_table(
        "manual_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("operator", sa.String(30), nullable=False),
        sa.Column("sender_name", sa.String(200), nullable=False),
        sa.Column("sender_country", sa.String(100), nullable=False),
        sa.Column("receipt_image_url", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("validated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # scan_logs
    # ------------------------------------------------------------------
    op.create_table(
        "scan_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id"), nullable=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("scanned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("result", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scan_logs_event_time", "scan_logs", ["event_id", "scanned_at"])

    # ------------------------------------------------------------------
    # audit_logs
    # ------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("payload", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_admin_time", "audit_logs", ["admin_id", "created_at"])


def downgrade() -> None:
    # Ordre inverse pour respecter les FK
    op.drop_index("ix_audit_logs_admin_time", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_scan_logs_event_time", table_name="scan_logs")
    op.drop_table("scan_logs")
    op.drop_table("manual_payments")
    op.drop_table("tickets")
    op.drop_index("ix_orders_created_at", table_name="orders")
    op.drop_index("ix_orders_event_status", table_name="orders")
    op.drop_table("orders")
    op.drop_table("email_automations")
    op.drop_table("chatbot_faqs")
    op.drop_table("whatsapp_groups")
    op.drop_table("event_content")
    op.drop_table("payment_config")
    op.drop_table("formulas")
    op.drop_table("events")
    op.drop_index("ix_participants_whatsapp", table_name="participants")
    op.drop_index("ix_participants_email", table_name="participants")
    op.drop_table("participants")
    op.drop_table("admins")
