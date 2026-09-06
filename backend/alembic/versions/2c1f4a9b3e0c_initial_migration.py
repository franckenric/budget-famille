"""initial migration for budget-famille

Revision ID: 2c1f4a9b3e0c
Revises:
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

from app.enum.fixed_charge_category import FixedChargeCategory
from app.enum.role_type import FamilyRoleType, RoleType
from app.enum.variable_category import VariableCategory

# revision identifiers, used by Alembic.
revision = "2c1f4a9b3e0c"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_roles_name"), "roles", ["name"], unique=True)

    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=True),
        sa.Column("family_id", sa.String(length=36), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("yellow_threshold", sa.Integer(), nullable=False),
        sa.Column("red_threshold", sa.Integer(), nullable=False),
        sa.Column("blocking_enabled", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index("ix_users_family_id", "users", ["family_id"], unique=False)

    op.create_table(
        "families",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner_user_id", sa.String(length=36), nullable=False),
        sa.Column("invite_code", sa.String(length=12), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_families_invite_code"), "families", ["invite_code"], unique=True)

    op.create_table(
        "family_members",
        sa.Column("family_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.Enum(FamilyRoleType), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_family_members_family_id"), "family_members", ["family_id"], unique=False)
    op.create_index("ix_family_members_family_user", "family_members", ["family_id", "user_id"], unique=False)
    op.create_index(op.f("ix_family_members_user_id"), "family_members", ["user_id"], unique=False)

    op.create_table(
        "budgets",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("family_id", sa.String(length=36), nullable=True),
        sa.Column("month", sa.String(length=7), nullable=False),
        sa.Column("capital", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("yellow_threshold", sa.Float(), nullable=False),
        sa.Column("red_threshold", sa.Float(), nullable=False),
        sa.Column("blocking_enabled", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "month", name="uq_budgets_user_month"),
    )
    op.create_index(op.f("ix_budgets_family_id"), "budgets", ["family_id"], unique=False)
    op.create_index("ix_budgets_user_month", "budgets", ["user_id", "month"], unique=False)
    op.create_index(op.f("ix_budgets_user_id"), "budgets", ["user_id"], unique=False)

    op.create_table(
        "fixed_charges",
        sa.Column("budget_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("due_day", sa.Integer(), nullable=False),
        sa.Column("is_paid", sa.Boolean(), nullable=False),
        sa.Column("category", sa.Enum(FixedChargeCategory), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_fixed_charges_budget_id"), "fixed_charges", ["budget_id"], unique=False)

    op.create_table(
        "variable_expenses",
        sa.Column("budget_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("category", sa.Enum(VariableCategory), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_variable_expenses_budget_id"), "variable_expenses", ["budget_id"], unique=False)
    op.create_index(op.f("ix_variable_expenses_user_id"), "variable_expenses", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("variable_expenses")
    op.drop_table("fixed_charges")
    op.drop_table("budgets")
    op.drop_table("family_members")
    op.drop_table("families")
    op.drop_table("users")
    op.drop_table("roles")