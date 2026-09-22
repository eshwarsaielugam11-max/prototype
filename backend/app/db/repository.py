"""Repository layer for TestRecord database operations.

Encapsulates all raw SQLAlchemy ORM interactions, providing a clean functional API
for route handlers and background services.
"""

from typing import List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.models.test_record import TestRecord
from backend.app.schemas.test_record import TestRecordCreate


def create_test_record(db: Session, record_in: TestRecordCreate) -> TestRecord:
    """Persist a new screening test record to the database.

    Args:
        db: Active SQLAlchemy database session.
        record_in: Pydantic schema containing validated screening record fields.

    Returns:
        Created and committed TestRecord ORM entity.
    """
    record_dict = record_in.model_dump()
    db_record = TestRecord(**record_dict)

    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def get_test_record(db: Session, record_id: str) -> Optional[TestRecord]:
    """Retrieve a single test record by its primary key UUID string.

    Args:
        db: Active SQLAlchemy database session.
        record_id: UUID primary key string.

    Returns:
        TestRecord if found, else None.
    """
    statement = select(TestRecord).where(TestRecord.id == str(record_id))
    return db.scalars(statement).first()


def list_test_records(
    db: Session,
    limit: int = 50,
    offset: int = 0,
) -> List[TestRecord]:
    """Fetch paginated test records ordered chronologically by created_at descending.

    Args:
        db: Active SQLAlchemy database session.
        limit: Maximum number of records to return.
        offset: Number of records to skip.

    Returns:
        List of TestRecord ORM entities ordered newest to oldest.
    """
    statement = (
        select(TestRecord)
        .order_by(desc(TestRecord.created_at))
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(statement).all())


def count_test_records(db: Session) -> int:
    """Return total number of screening records in the database."""
    statement = select(func.count(TestRecord.id))
    return db.scalar(statement) or 0


def update_test_record_report(
    db: Session,
    record_id: str,
    report_json: str,
) -> Optional[TestRecord]:
    """Attach or update the generated clinical decision support report JSON payload.

    Args:
        db: Active SQLAlchemy database session.
        record_id: UUID primary key string.
        report_json: Serialized JSON report string.

    Returns:
        Updated TestRecord if found, else None.
    """
    record = get_test_record(db, record_id)
    if not record:
        return None

    record.report_json = report_json
    db.commit()
    db.refresh(record)
    return record


def delete_test_record(db: Session, record_id: str) -> bool:
    """Delete a screening test record by its UUID string.

    Args:
        db: Active SQLAlchemy database session.
        record_id: UUID primary key string.

    Returns:
        True if record was deleted, False if record was not found.
    """
    record = get_test_record(db, record_id)
    if not record:
        return False

    db.delete(record)
    db.commit()
    return True
