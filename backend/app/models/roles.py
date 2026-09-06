from sqlalchemy import Column, String

from app.db.base_class import Base, IdMixin


class Roles(IdMixin, Base):
    __tablename__ = "roles"
    name = Column(String(50), nullable=False, unique=True, index=True)