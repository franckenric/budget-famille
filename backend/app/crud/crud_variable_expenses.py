from typing import Any, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.variable_expenses import VariableExpenses
from app.schemas.variable_expenses import VariableExpensesCreate, VariableExpensesUpdate


class CRUDVariableExpenses(CRUDBase[VariableExpenses, VariableExpensesCreate, VariableExpensesUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[VariableExpenses]:
        return db.query(VariableExpenses).filter(getattr(VariableExpenses, field) == value).first()

    def create(
        self,
        db: Session,
        *,
        obj_in: VariableExpensesCreate,
        user_id: Optional[str] = None,
        commit: bool = True,
        refresh: bool = True,
    ) -> VariableExpenses:
        data = obj_in.model_dump(exclude_unset=True)
        if user_id:
            data["user_id"] = user_id
        db_obj = VariableExpenses(**data)
        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj


variable_expenses = CRUDVariableExpenses(VariableExpenses)