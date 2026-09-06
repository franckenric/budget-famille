from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin
from app.enum.role_type import FamilyRoleType


class FamilyMembers(IdMixin, Base):
    __tablename__ = "family_members"

    family_id = Column(String(36), ForeignKey("families.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum(FamilyRoleType), nullable=False, default=FamilyRoleType.member)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relations
    family = relationship(
        "Families",
        back_populates="members",
        foreign_keys=[family_id],
    )
    user = relationship(
        "Users",
        back_populates="memberships",
        foreign_keys=[user_id],
    )

    __table_args__ = (Index("ix_family_members_family_user", "family_id", "user_id"),)