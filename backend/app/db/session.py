"""SQLAlchemy session management and SQLite engine setup.

Configures connection pooling, SessionLocal factory, declarative Base,
and the get_db dependency for FastAPI route handlers.
"""

from typing import Generator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from backend.app.config import get_settings

settings = get_settings()

# Ensure parent directory for database file exists
db_file_path = Path(settings.sqlite_db_path).resolve()
db_file_path.parent.mkdir(parents=True, exist_ok=True)

# SQLite connection URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_file_path}"

# SQLite requires check_same_thread=False for multithreaded FastAPI worker threads
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a transactional SQLAlchemy session.

    Ensures session is cleanly closed upon request completion or failure.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
