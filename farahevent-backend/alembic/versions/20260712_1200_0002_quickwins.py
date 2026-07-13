"""quickwins — 2FA secret temporaire (anti-verrouillage) + index perf

Revision ID: 0002_quickwins
Revises: 0001_initial_schema
Create Date: 2026-07-12 12:00:00

Contenu (audit §C.1, §D) :
- admins.two_factor_secret_temp : secret 2FA en attente de confirmation, promu
  vers two_factor_secret seulement après un premier OTP validé (évite qu'un
  setup abandonné verrouille le compte).
- ix_tickets_order_id  : lookups fréquents par commande (génération/resend/scan).
- ix_formulas_event_id : lookups fréquents par événement (formules publiques/admin).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_quickwins"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "admins",
        sa.Column("two_factor_secret_temp", sa.String(64), nullable=True),
    )
    op.create_index("ix_tickets_order_id", "tickets", ["order_id"])
    op.create_index("ix_formulas_event_id", "formulas", ["event_id"])


def downgrade() -> None:
    op.drop_index("ix_formulas_event_id", table_name="formulas")
    op.drop_index("ix_tickets_order_id", table_name="tickets")
    op.drop_column("admins", "two_factor_secret_temp")
