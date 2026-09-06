from sqlalchemy import (
    Boolean,
    Column,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin
from app.enum.fixed_charge_category import FixedChargeCategory


class FixedChargeTemplates(IdMixin, Base):
    """Charge fixe récurrente : définie une fois, reproposée chaque mois."""

    __tablename__ = "fixed_charge_templates"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    default_amount = Column(Float, nullable=False, default=0.0)
    due_day = Column(Integer, nullable=False, default=1)
    category = Column(
        Enum(FixedChargeCategory), nullable=False, default=FixedChargeCategory.autre
    )

    # Relations
    user = relationship("Users", foreign_keys=[user_id])


class FixedCharges(IdMixin, Base):
    """Occurrence mensuelle d'une charge (gabarit récurrent ou ponctuelle)."""

    __tablename__ = "fixed_charges"

    budget_id = Column(String(36), ForeignKey("budgets.id"), nullable=False, index=True)
    template_id = Column(
        String(36),
        ForeignKey("fixed_charge_templates.id"),
        nullable=True,
        index=True,
    )
    month = Column(String(7), nullable=True, index=True)  # format: "2026-09"
    name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    due_day = Column(Integer, nullable=False, default=1)
    is_paid = Column(Boolean, nullable=False, default=False)
    category = Column(
        Enum(FixedChargeCategory), nullable=False, default=FixedChargeCategory.autre
    )

    # Relations
    budget = relationship(
        "Budgets",
        back_populates="fixed_charges",
        foreign_keys=[budget_id],
    )
    template = relationship("FixedChargeTemplates", foreign_keys=[template_id])