"""add payments json to debts

Revision ID: 6d8a4c2e1b50
Revises: 5c9f3a2b1d70
Create Date: 2026-09-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

# revision identifiers, used by Alembic.
revision = "6d8a4c2e1b50"
down_revision = "5c9f3a2b1d70"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "debts",
        sa.Column("payments", MySQLJSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("debts", "payments")