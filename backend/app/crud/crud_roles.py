from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.roles import Roles
from app.schemas.roles import RolesCreate, RolesUpdate


class CRUDRoles(CRUDBase[Roles, RolesCreate, RolesUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Roles]:
        return db.query(Roles).filter(Roles.name == name).first()

    def ensure_default_roles(self, db: Session) -> None:
        for role_name in ("admin", "member"):
            if not self.get_by_name(db, name=role_name):
                db.add(Roles(name=role_name))
        db.commit()


roles = CRUDRoles(Roles)