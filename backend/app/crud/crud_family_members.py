from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.crud.base import CRUDBase
from app.enum.role_type import FamilyRoleType
from app.models.family_members import FamilyMembers
from app.schemas.family_members import FamilyMembersCreate, FamilyMembersUpdate


class CRUDFamilyMembers(CRUDBase[FamilyMembers, FamilyMembersCreate, FamilyMembersUpdate]):
    def add_member(
        self,
        db: Session,
        *,
        family_id: str,
        user_id: str,
        role: FamilyRoleType = FamilyRoleType.member,
        commit: bool = True,
    ) -> FamilyMembers:
        member = FamilyMembers(family_id=family_id, user_id=user_id, role=role, is_active=True)
        db.add(member)
        if commit:
            db.commit()
            db.refresh(member)
        return member

    def get_by_user_and_family(
        self, db: Session, *, family_id: str, user_id: str
    ) -> Optional[FamilyMembers]:
        return (
            db.query(FamilyMembers)
            .filter(
                FamilyMembers.family_id == family_id,
                FamilyMembers.user_id == user_id,
                FamilyMembers.deleted_at.is_(None),
            )
            .first()
        )

    def list_with_user(self, db: Session, *, family_id: str) -> List[FamilyMembers]:
        return (
            db.query(FamilyMembers)
            .options(joinedload(FamilyMembers.user))
            .filter(
                FamilyMembers.family_id == family_id,
                FamilyMembers.deleted_at.is_(None),
            )
            .all()
        )


family_members = CRUDFamilyMembers(FamilyMembers)