"""avisos eliminados por la persona (se esconden, no se borran)

Revision ID: 5d2e8a41c7f3
Revises: c52470262bd5
Create Date: 2026-10-19 09:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '5d2e8a41c7f3'
down_revision = 'c52470262bd5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('alertas', sa.Column('eliminada', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    op.drop_column('alertas', 'eliminada')
