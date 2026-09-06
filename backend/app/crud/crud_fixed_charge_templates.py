from typing import Any, List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.fixed_charges import FixedChargeTemplates
from app.schemas.fixed_charges import (
    FixedChargeTemplatesCreate,
    FixedChargeTemplatesUpdate,
)


class CRUDFixedChargeTemplates(
    CRUDBase[
        FixedChargeTemplates,
        FixedChargeTemplatesCreate,
        FixedChargeTemplatesUpdate,
    ]
):
    def create(
        self,
        db: Session,
        *,
        obj_in: FixedChargeTemplatesCreate,
        user_id: str,
        commit: bool = True,
        refresh: bool = True,
    ) -> FixedChargeTemplates:
        data = obj_in.model_dump(exclude_unset=True)
        data["user_id"] = user_id
        db_obj = FixedChargeTemplates(**data)
        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj

    def get_by_user_id(self, db: Session, *, user_id: str) -> List[FixedChargeTemplates]:
        return (
            db.query(FixedChargeTemplates)
            .filter(
                FixedChargeTemplates.user_id == user_id,
                FixedChargeTemplates.deleted_at.is_(None),
            )
            .order_by(FixedChargeTemplates.name)
            .all()
        )


fixed_charge_templates = CRUDFixedChargeTemplates(FixedChargeTemplates)