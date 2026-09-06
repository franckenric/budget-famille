from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin
from app.enum.variable_category import VariableCategory


class VariableExpenses(IdMixin, Base):
    __tablename__ = "variable_expenses"

    budget_id = Column(String(36), ForeignKey("budgets.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    expense_date = Column(Date, nullable=False)
    category = Column(
        Enum(VariableCategory), nullable=False, default=VariableCategory.autre
    )
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, nullable=False, default=False)

    # Relations
    budget = relationship(
        "Budgets",
        back_populates="variable_expenses",
        foreign_keys=[budget_id],
    )
    user = relationship("Users", foreign_keys=[user_id])