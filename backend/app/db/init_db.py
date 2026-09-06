"""
Database seed data generated in correct order.
"""
import logging
from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database with seed data."""
    # Tables should be created with Alembic migrations.
    crud.roles.ensure_default_roles(db)