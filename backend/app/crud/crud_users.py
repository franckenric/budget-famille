from typing import Any, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.crud.crud_roles import roles
from app.models.users import Users
from app.schemas.users import UsersCreate, UsersUpdate
from app.core.security import get_password_hash, verify_password


class CRUDUsers(CRUDBase[Users, UsersCreate, UsersUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[Users]:
        return db.query(Users).filter(Users.email == email).first()

    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Users]:
        return db.query(Users).filter(getattr(Users, field) == value).first()

    def is_active(self, user: Users) -> bool:
        return bool(user.is_active)

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[Users]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create(self, db: Session, *, obj_in: UsersCreate) -> Users:
        data = obj_in.model_dump(exclude_unset=True)
        raw_password = data.pop("password")
        role_name = data.pop("role_name", "member")
        invite_code = data.pop("invite_code", None)

        role = roles.get_by_name(db, name=role_name) or roles.get_by_name(db, name="member")

        db_obj = Users(
            hashed_password=get_password_hash(raw_password),
            role_id=role.id if role else None,
            **data,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Users, obj_in: UsersUpdate, commit: bool = True) -> Users:
        update_data = obj_in.model_dump(exclude_unset=True)
        raw_password = update_data.pop("password", None)
        if raw_password:
            update_data["hashed_password"] = get_password_hash(raw_password)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        if commit:
            db.commit()
            db.refresh(db_obj)
        return db_obj


users = CRUDUsers(Users)