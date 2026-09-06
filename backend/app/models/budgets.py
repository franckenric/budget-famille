from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin


class Budgets(IdMixin, Base):
    __tablename__ = "budgets"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    family_id = Column(String(36), ForeignKey("families.id"), nullable=True, index=True)
    month = Column(String(7), nullable=False, index=True)  # format: "2026-09"
    capital = Column(Float, nullable=False, default=0.0)

    # Paramètres du budget (alignés sur le frontend BudgetSettings)
    currency = Column(String(10), nullable=False, default="MGA")
    yellow_threshold = Column(Float, nullable=False, default=0.70)
    red_threshold = Column(Float, nullable=False, default=0.85)
    blocking_enabled = Column(Boolean, nullable=False, default=True)

    # Relations
    user = relationship("Users", foreign_keys=[user_id])
    fixed_charges = relationship(
        "FixedCharges",
        back_populates="budget",
        foreign_keys="FixedCharges.budget_id",
        cascade="all, delete-orphan",
    )
    variable_expenses = relationship(
        "VariableExpenses",
        back_populates="budget",
        foreign_keys="VariableExpenses.budget_id",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "month", name="uq_budgets_user_month"),
        Index("ix_budgets_user_month", "user_id", "month"),
    )