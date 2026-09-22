"""Database initialization and schema auto-creation."""

import logging
from pathlib import Path
from backend.app.config import get_settings
from backend.app.db.session import Base, engine
import backend.app.models.test_record  # Ensure all models are registered with Base.metadata

logger = logging.getLogger("parkinsons_platform.db")


def init_db() -> None:
    """Auto-create database tables on application startup if they do not exist."""
    settings = get_settings()
    db_file_path = Path(settings.sqlite_db_path).resolve()
    db_file_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Initializing SQLite database at: %s", db_file_path)
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified: test_records table is ready.")
