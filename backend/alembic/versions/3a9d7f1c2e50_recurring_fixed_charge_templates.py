"""recurring fixed charge templates

Revision ID: 3a9d7f1c2e50
Revises: 2c1f4a9b3e0c
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

from app.enum.fixed_charge_category import FixedChargeCategory

# revision identifiers, used by Alembic.
revision = "3a9d7f1c2e50"
down_revision = "2c1f4a9b3e0c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fixed_charge_templates",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("default_amount", sa.Float(), nullable=False),
        sa.Column("due_day", sa.Integer(), nullable=False),
        sa.Column("category", sa.Enum(FixedChargeCategory), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_fixed_charge_templates_user_id"),
        "fixed_charge_templates",
        ["user_id"],
        unique=False,
    )

    # Les charges fixes existantes deviennent des occurrences mensuelles :
    # on lie au gabarit (optionnel) et on mémorise le mois.
    # (Opérations directes : op.batch_alter_table est un pattern SQLite.)
    op.add_column(
        "fixed_charges",
        sa.Column("template_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "fixed_charges",
        sa.Column("month", sa.String(length=7), nullable=True),
    )
    op.create_foreign_key(
        "fk_fixed_charges_template_id",
        "fixed_charges",
        "fixed_charge_templates",
        ["template_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_fixed_charges_template_id"),
        "fixed_charges",
        ["template_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fixed_charges_month"),
        "fixed_charges",
        ["month"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_fixed_charges_month"), table_name="fixed_charges")
    op.drop_index(op.f("ix_fixed_charges_template_id"), table_name="fixed_charges")
    op.drop_constraint("fk_fixed_charges_template_id", "fixed_charges", type_="foreignkey")
    op.drop_column("fixed_charges", "month")
    op.drop_column("fixed_charges", "template_id")
    op.drop_index(
        op.f("ix_fixed_charge_templates_user_id"),
        table_name="fixed_charge_templates",
    )
    op.drop_table("fixed_charge_templates")