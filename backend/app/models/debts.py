from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin


class Debts(IdMixin, Base):
    __tablename__ = "debts"

    budget_id = Column(String(36), ForeignKey("budgets.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    lender_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    reason = Column(String(500), nullable=True)
    debt_date = Column(Date, nullable=False)

    # Remboursement par mois
    monthly_amount = Column(Float, nullable=True)  # Montant payé par mois (null = tout d'un coup)
    start_date = Column(Date, nullable=True)        # Mois de début du remboursement

    # Paiements effectifs [{ "date": "YYYY-MM-DD", "amount": number }]
    payments = Column(MySQLJSON, nullable=True, default=list)

    # Statut
    is_repaid = Column(Boolean, nullable=False, default=False)
    repaid_date = Column(Date, nullable=True)

    # Relations
    budget = relationship(
        "Budgets",
        back_populates="debts",
        foreign_keys=[budget_id],
    )
    user = relationship("Users", foreign_keys=[user_id])
