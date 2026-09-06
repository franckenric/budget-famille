import secrets

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin


def generate_invite_code() -> str:
    return secrets.token_hex(4).upper()


class Families(IdMixin, Base):
    __tablename__ = "families"

    name = Column(String(255), nullable=False)
    owner_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    invite_code = Column(
        String(12), nullable=False, unique=True, index=True, default=generate_invite_code
    )

    # Relations
    owner = relationship("Users", foreign_keys=[owner_user_id], post_update=True)
    users = relationship(
        "Users",
        foreign_keys="Users.family_id",
        back_populates="family",
    )
    members = relationship(
        "FamilyMembers",
        back_populates="family",
        foreign_keys="FamilyMembers.family_id",
        cascade="all, delete-orphan",
    )