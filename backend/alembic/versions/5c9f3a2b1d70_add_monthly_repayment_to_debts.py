"""add monthly repayment to debts

Revision ID: 5c9f3a2b1d70
Revises: 4b8e2f1a3d60
Create Date: 2026-09-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "5c9f3a2b1d70"
down_revision = "4b8e2f1a3d60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "debts",
        sa.Column("monthly_amount", sa.Float(), nullable=True),
    )
    op.add_column(
        "debts",
        sa.Column("start_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("debts", "start_date")
    op.drop_column("debts", "monthly_amount")
