"""Unit tests directly testing the database repository layer functions."""

import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db.repository import (
    count_test_records,
    create_test_record,
    delete_test_record,
    get_test_record,
    list_test_records,
    update_test_record_report,
)
from backend.app.db.session import Base
from backend.app.schemas.test_record import TestRecordCreate


@pytest.fixture
def db_session():
    """In-memory SQLite session with StaticPool for repository isolation."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_repository_crud_lifecycle(db_session):
    """Verify complete CRUD lifecycle through repository functions."""
    assert count_test_records(db_session) == 0

    # 1. Create
    record_in = TestRecordCreate(
        test_id="PATIENT-CRUD-001",
        source="recording",
        prediction="parkinsons_risk_indicated",
        probability=0.875,
        threshold_used=0.55,
        audio_duration_sec=3.8,
        model_version="colab-t4-run-20260922",
        attention_heatmap_json=json.dumps({"timestamps_sec": [0.0, 1.0], "attention": [0.2, 0.8]}),
        report_json=None,
    )
    created = create_test_record(db_session, record_in)
    assert created.id is not None
    assert count_test_records(db_session) == 1

    # 2. Get by ID
    fetched = get_test_record(db_session, str(created.id))
    assert fetched is not None
    assert fetched.test_id == "PATIENT-CRUD-001"
    assert fetched.probability == 0.875

    # 3. Update report_json
    dummy_report = json.dumps({"status": "generated"})
    updated = update_test_record_report(db_session, str(created.id), dummy_report)
    assert updated is not None
    assert updated.report_json == dummy_report

    # Verify update persisted
    re_fetched = get_test_record(db_session, str(created.id))
    assert re_fetched.report_json == dummy_report

    # 4. Delete
    deleted = delete_test_record(db_session, str(created.id))
    assert deleted is True
    assert count_test_records(db_session) == 0
    assert get_test_record(db_session, str(created.id)) is None


def test_repository_list_and_pagination(db_session):
    """Verify list_test_records ordering and limit/offset pagination."""
    created_ids = []
    for i in range(5):
        record_in = TestRecordCreate(
            test_id=f"PATIENT-PAGE-{i:02d}",
            source="upload",
            prediction="low_risk_indicated" if i % 2 == 0 else "parkinsons_risk_indicated",
            probability=0.1 * (i + 1),
            threshold_used=0.55,
            audio_duration_sec=4.0,
            model_version="colab-t4-run-20260922",
            attention_heatmap_json=json.dumps({"idx": i}),
            report_json=None,
        )
        rec = create_test_record(db_session, record_in)
        created_ids.append(str(rec.id))

    assert count_test_records(db_session) == 5

    # Fetch page 1 (limit=2, offset=0)
    page1 = list_test_records(db_session, limit=2, offset=0)
    assert len(page1) == 2
    assert str(page1[0].id) == created_ids[4]  # newest first
    assert str(page1[1].id) == created_ids[3]

    # Fetch page 2 (limit=2, offset=2)
    page2 = list_test_records(db_session, limit=2, offset=2)
    assert len(page2) == 2
    assert str(page2[0].id) == created_ids[2]
    assert str(page2[1].id) == created_ids[1]

    # Fetch page 3 (limit=2, offset=4)
    page3 = list_test_records(db_session, limit=2, offset=4)
    assert len(page3) == 1
    assert str(page3[0].id) == created_ids[0]


def test_repository_nonexistent_lookups(db_session):
    """Verify repository functions gracefully return None / False for nonexistent IDs."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    assert get_test_record(db_session, fake_id) is None
    assert update_test_record_report(db_session, fake_id, "{}") is None
    assert delete_test_record(db_session, fake_id) is False
