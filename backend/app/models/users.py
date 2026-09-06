from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base, IdMixin


class Users(IdMixin, Base):
    __tablename__ = "users"

    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    family_id = Column(String(36), ForeignKey("families.id"), nullable=True)

    # Paramètres utilisateur
    currency = Column(String(10), nullable=False, default="MGA")
    yellow_threshold = Column(Integer, nullable=False, default=70)
    red_threshold = Column(Integer, nullable=False, default=85)
    blocking_enabled = Column(Boolean, nullable=False, default=True)

    # Relations
    role = relationship("Roles", foreign_keys=[role_id])
    family = relationship(
        "Families",
        foreign_keys=[family_id],
        back_populates="users",
    )
    memberships = relationship(
        "FamilyMembers",
        back_populates="user",
        foreign_keys="FamilyMembers.user_id",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_users_family_id", "family_id"),)