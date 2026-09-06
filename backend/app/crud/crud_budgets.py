from datetime import date
from typing import List, Optional

from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.budgets import Budgets
from app.models.fixed_charges import FixedCharges
from app.models.variable_expenses import VariableExpenses
from app.schemas.budgets import (
    BudgetsCreate,
    BudgetsUpdate,
    BudgetSummary,
)
from app.schemas.variable_expenses import CompareItem, CategoryStatItem, CategoryStats, DailyStatItem


class CRUDBudgets(CRUDBase[Budgets, BudgetsCreate, BudgetsUpdate]):
    def create(
        self,
        db: Session,
        *,
        obj_in: BudgetsCreate,
        user_id: Optional[str] = None,
        family_id: Optional[str] = None,
        commit: bool = True,
        refresh: bool = True,
    ) -> Budgets:
        data = obj_in.model_dump(exclude_unset=True)
        if user_id:
            data["user_id"] = user_id
        if family_id:
            data["family_id"] = family_id
        db_obj = Budgets(**data)
        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj

    def get_by_user_month(self, db: Session, *, user_id: str, month: str) -> Optional[Budgets]:
        return (
            db.query(Budgets)
            .filter(
                Budgets.user_id == user_id,
                Budgets.month == month,
                Budgets.deleted_at.is_(None),
            )
            .first()
        )

    def get_or_create(
        self,
        db: Session,
        *,
        user_id: str,
        month: str,
        family_id: Optional[str] = None,
        capital: float = 0.0,
    ) -> Budgets:
        budget = self.get_by_user_month(db, user_id=user_id, month=month)
        if budget:
            return budget
        budget = Budgets(user_id=user_id, month=month, family_id=family_id, capital=capital)
        db.add(budget)
        db.commit()
        db.refresh(budget)
        return budget

    def _fixed_totals(self, db: Session, budget_id: str):
        row = (
            db.query(
                func.coalesce(func.sum(FixedCharges.amount), 0.0).label("all_fixed"),
                func.coalesce(
                    func.sum(
                        case((FixedCharges.is_paid.is_(True), FixedCharges.amount), else_=0)
                    ),
                    0.0,
                ).label("paid_fixed"),
                func.count(FixedCharges.id).label("fixed_count"),
                func.count(
                    case((FixedCharges.is_paid.is_(True), 1))
                ).label("paid_count"),
            )
            .filter(
                FixedCharges.budget_id == budget_id,
                FixedCharges.deleted_at.is_(None),
            )
            .first()
        )
        return {
            "total_fixed": float(row.all_fixed or 0),
            "paid_fixed": float(row.paid_fixed or 0),
            "fixed_count": row.fixed_count or 0,
            "paid_count": row.paid_count or 0,
        }

    def _variable_total(self, db: Session, budget_id: str):
        return float(
            db.query(func.coalesce(func.sum(VariableExpenses.amount), 0.0))
            .filter(
                VariableExpenses.budget_id == budget_id,
                VariableExpenses.deleted_at.is_(None),
            )
            .scalar()
            or 0
        )

    def summary(self, db: Session, budget: Budgets) -> BudgetSummary:
        fixed = self._fixed_totals(db, budget.id)
        variable = self._variable_total(db, budget.id)

        total_spent = fixed["paid_fixed"] + variable
        capital = budget.capital or 0
        percent_spent = (total_spent / capital * 100) if capital > 0 else 0

        if capital > 0 and percent_spent >= 100:
            alert_level = "over"
        elif percent_spent >= budget.red_threshold * 100:
            alert_level = "red"
        elif percent_spent >= budget.yellow_threshold * 100:
            alert_level = "yellow"
        else:
            alert_level = "none"

        return BudgetSummary(
            month=budget.month,
            capital=capital,
            total_fixed=fixed["total_fixed"],
            total_variable=variable,
            total_spent=total_spent,
            remaining=capital - total_spent,
            percent_spent=round(percent_spent, 2),
            alert_level=alert_level,
            fixed_total_count=fixed["fixed_count"],
            fixed_paid_count=fixed["paid_count"],
            variable_count=int(
                db.query(func.count(VariableExpenses.id))
                .filter(
                    VariableExpenses.budget_id == budget.id,
                    VariableExpenses.deleted_at.is_(None),
                )
                .scalar()
                or 0
            ),
        )

    def category_stats(self, db: Session, budget_id: str) -> CategoryStats:
        month = self._budget_month(db, budget_id) or ""
        cat_rows = (
            db.query(
                VariableExpenses.category,
                func.sum(VariableExpenses.amount).label("total"),
                func.count(VariableExpenses.id).label("count"),
            )
            .filter(
                VariableExpenses.budget_id == budget_id,
                VariableExpenses.deleted_at.is_(None),
            )
            .group_by(VariableExpenses.category)
            .all()
        )
        day_rows = (
            db.query(
                VariableExpenses.expense_date,
                func.sum(VariableExpenses.amount).label("total"),
                func.count(VariableExpenses.id).label("count"),
            )
            .filter(
                VariableExpenses.budget_id == budget_id,
                VariableExpenses.deleted_at.is_(None),
            )
            .group_by(VariableExpenses.expense_date)
            .order_by(VariableExpenses.expense_date)
            .all()
        )
        categories = [
            CategoryStatItem(category=str(r[0].value), total=float(r[1] or 0), count=int(r[2] or 0))
            for r in cat_rows
        ]
        daily = [
            DailyStatItem(date=r[0].isoformat(), total=float(r[1] or 0), count=int(r[2] or 0))
            for r in day_rows
        ]
        return CategoryStats(
            month=month,
            total_variable=self._variable_total(db, budget_id),
            categories=categories,
            daily=daily,
        )

    def _budget_month(self, db: Session, budget_id: str) -> Optional[str]:
        b = db.query(Budgets.month).filter(Budgets.id == budget_id).first()
        return b[0] if b else None

    def month_comparison(self, db: Session, *, user_id: str, limit: int = 6) -> List[CompareItem]:
        items: List[CompareItem] = []
        budgets = (
            db.query(Budgets)
            .filter(Budgets.user_id == user_id, Budgets.deleted_at.is_(None))
            .order_by(desc(Budgets.month))
            .limit(limit)
            .all()
        )
        for b in budgets:
            s = self.summary(db, b)
            items.append(
                CompareItem(
                    month=b.month,
                    capital=s.capital,
                    total_fixed=s.total_fixed,
                    total_variable=s.total_variable,
                    total_spent=s.total_spent,
                )
            )
        return items


budgets = CRUDBudgets(Budgets)