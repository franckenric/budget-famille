"""add debts table

Revision ID: 4b8e2f1a3d60
Revises: 3a9d7f1c2e50
Create Date: 2026-09-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "4b8e2f1a3d60"
down_revision = "3a9d7f1c2e50"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "debts",
        sa.Column("budget_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("lender_name", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("debt_date", sa.Date(), nullable=False),
        sa.Column("is_repaid", sa.Boolean(), nullable=False),
        sa.Column("repaid_date", sa.Date(), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_debts_budget_id"),
        "debts",
        ["budget_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_debts_user_id"),
        "debts",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_debts_user_id"), table_name="debts")
    op.drop_index(op.f("ix_debts_budget_id"), table_name="debts")
    op.drop_table("debts")
