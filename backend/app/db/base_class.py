from typing import Any

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.orm import as_declarative, declared_attr

from app.utils import camel_to_snake, generate_uuid


class IdMixin:
    """Mixin fournissant une PK UUID (texte) par défaut."""

    id = Column(String(36), primary_key=True, default=generate_uuid, unique=True)

    @classmethod
    def generate_id(cls) -> str:
        return generate_uuid()


@as_declarative()
class Base:
    id: Any
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return camel_to_snake(cls)

    # Columns partagées par tous les modèles
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)