from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


_is_sqlite = settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite")

# connect_args={"check_same_thread": False} n'est valable que pour SQLite.
_engine_kwargs = {
    "pool_pre_ping": True,
    "pool_size": 10,
    "max_overflow": 20,
    "pool_timeout": 30,
    "pool_recycle": 3600,
}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)