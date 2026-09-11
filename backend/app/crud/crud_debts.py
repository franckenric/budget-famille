from typing import Any, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.debts import Debts
from app.schemas.debts import DebtsCreate, DebtsUpdate


class CRUDDebts(CRUDBase[Debts, DebtsCreate, DebtsUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Debts]:
        return db.query(Debts).filter(getattr(Debts, field) == value).first()

    def create(
        self,
        db: Session,
        *,
        obj_in: DebtsCreate,
        user_id: Optional[str] = None,
        commit: bool = True,
        refresh: bool = True,
    ) -> Debts:
        data = obj_in.model_dump(exclude_unset=True)
        if user_id:
            data["user_id"] = user_id
        db_obj = Debts(**data)
        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj


debts = CRUDDebts(Debts)
