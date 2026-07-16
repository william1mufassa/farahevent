"""Ajoute events.live_links_sent (colonne présente dans le modèle, sans migration).

Le modèle Event déclare `live_links_sent` (utilisé par live_notifier pour ne pas
renvoyer deux fois les liens du live), mais aucune migration ne la créait :
`alembic upgrade head` produisait donc un schéma incomplet et la boucle
`live_notifier_loop` plantait en continu avec
`UndefinedColumnError: column events.live_links_sent does not exist`.

Non détecté par la suite de tests : `conftest.py` construit le schéma via
`Base.metadata.create_all` (donc depuis le modèle), jamais via Alembic — un
oubli de migration y est structurellement invisible. Cf. ROADMAP_REMEDIATION.md.

Revision ID: 0004_live_links_sent
Revises: 4f340a4d4589
Create Date: 2026-07-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_live_links_sent"
down_revision: Union[str, None] = "4f340a4d4589"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "live_links_sent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "live_links_sent")
