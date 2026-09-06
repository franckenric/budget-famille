from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.crud.crud_family_members import family_members
from app.crud.crud_roles import roles
from app.enum.role_type import FamilyRoleType
from app.models.families import Families
from app.models.family_members import FamilyMembers
from app.models.users import Users
from app.schemas.families import FamiliesCreate, FamiliesUpdate


class CRUDFamilies(CRUDBase[Families, FamiliesCreate, FamiliesUpdate]):
    def get_by_invite_code(self, db: Session, *, invite_code: str) -> Optional[Families]:
        return (
            db.query(Families)
            .filter(Families.invite_code == invite_code.upper())
            .first()
        )

    def create_family(self, db: Session, *, owner: Users, name: str) -> Families:
        family = Families(name=name, owner_user_id=owner.id)
        db.add(family)
        db.flush()

        member_role = roles.get_by_name(db, name="admin")
        family_members.add_member(
            db, family_id=family.id, user_id=owner.id,
            role=FamilyRoleType.admin, commit=False,
        )
        owner.family_id = family.id
        db.add(owner)
        db.commit()
        db.refresh(family)
        return family

    def join_family(self, db: Session, *, user: Users, invite_code: str) -> Optional[Families]:
        family = self.get_by_invite_code(db, invite_code=invite_code)
        if not family:
            return None
        # si déjà membre, on renvoie la famille
        existing = family_members.get_by_user_and_family(
            db, family_id=family.id, user_id=user.id
        )
        if not existing:
            member_role = roles.get_by_name(db, name="member")
            family_members.add_member(
                db, family_id=family.id, user_id=user.id,
                role=FamilyRoleType.member, commit=False,
            )
            user.family_id = family.id
            db.add(user)
            db.commit()
        db.refresh(family)
        return family


families = CRUDFamilies(Families)