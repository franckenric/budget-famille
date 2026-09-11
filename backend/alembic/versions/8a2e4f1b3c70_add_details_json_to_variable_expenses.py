"""add details json to variable_expenses

Revision ID: 8a2e4f1b3c70
Revises: 7f5b3d9a0c40
Create Date: 2026-09-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

# revision identifiers, used by Alembic.
revision = "8a2e4f1b3c70"
down_revision = "7f5b3d9a0c40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "variable_expenses",
        sa.Column("details", MySQLJSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("variable_expenses", "details")
