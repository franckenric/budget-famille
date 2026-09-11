"""make debts budget_id nullable (global debts)

Revision ID: 7f5b3d9a0c40
Revises: 6d8a4c2e1b50
Create Date: 2026-09-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "7f5b3d9a0c40"
down_revision = "6d8a4c2e1b50"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("debts", "budget_id", existing_type=sa.String(36), nullable=True)


def downgrade() -> None:
    op.alter_column("debts", "budget_id", existing_type=sa.String(36), nullable=False)