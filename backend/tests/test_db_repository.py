"""Unit tests for SQLite database session, models, and repository layer."""

import json
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.session import Base
from backend.app.models.test_record import TestRecord
from backend.app.schemas.test_record import TestRecordCreate
from backend.app.db.repository import (
    create_test_record,
    get_test_record,
    list_test_records,
    count_test_records,
    update_test_record_report,
    delete_test_record,
)


@pytest.fixture
def test_db_session():
    """Create in-memory SQLite database session for unit testing."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_create_and_get_test_record_round_trip(test_db_session):
    """Verify record creation and retrieval round-trip through repository."""
    dummy_heatmap = json.dumps({"timestamps_sec": [0.0, 0.5, 1.0], "attention": [0.1, 0.9, 0.3]})

    record_in = TestRecordCreate(
        test_id="PATIENT-001",
        source="recording",
        prediction="parkinsons_risk_indicated",
        probability=0.8842,
        threshold_used=0.55,
        audio_duration_sec=4.0,
        model_version="colab-t4-run-20260922",
        attention_heatmap_json=dummy_heatmap,
        report_json=None,
    )

    created = create_test_record(test_db_session, record_in)
    assert created.id is not None
    assert len(created.id) == 36  # UUID string
    assert created.created_at is not None
    assert created.prediction == "parkinsons_risk_indicated"
    assert created.probability == 0.8842
    assert created.report_json is None

    # Fetch back
    fetched = get_test_record(test_db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.test_id == "PATIENT-001"
    assert fetched.prediction == "parkinsons_risk_indicated"
    assert fetched.attention_heatmap_json == dummy_heatmap


def test_list_test_records_ordering(test_db_session):
    """Verify list_test_records returns items ordered chronologically descending (newest first)."""
    dummy_heatmap = json.dumps({"timestamps_sec": [0.0], "attention": [0.5]})

    # Insert 3 records
    for i in range(3):
        create_test_record(
            test_db_session,
            TestRecordCreate(
                test_id=f"SEQ-{i}",
                source="upload",
                prediction="low_risk_indicated",
                probability=0.12 + (i * 0.05),
                threshold_used=0.55,
                audio_duration_sec=3.5,
                model_version="v1",
                attention_heatmap_json=dummy_heatmap,
            ),
        )

    records = list_test_records(test_db_session, limit=10)
    assert len(records) == 3
    # Check descending order: newest created_at >= previous
    assert records[0].created_at >= records[1].created_at
    assert records[1].created_at >= records[2].created_at
    assert count_test_records(test_db_session) == 3


def test_update_and_delete_test_record(test_db_session):
    """Verify report attachment update and record deletion."""
    dummy_heatmap = json.dumps({"timestamps_sec": [0.0], "attention": [0.5]})

    rec = create_test_record(
        test_db_session,
        TestRecordCreate(
            test_id="UPDATE-TEST",
            source="recording",
            prediction="low_risk_indicated",
            probability=0.05,
            threshold_used=0.55,
            audio_duration_sec=4.0,
            model_version="v1",
            attention_heatmap_json=dummy_heatmap,
        ),
    )

    report_payload = json.dumps({"summary": "Clinical speech markers normal."})
    updated = update_test_record_report(test_db_session, rec.id, report_payload)
    assert updated is not None
    assert updated.report_json == report_payload

    # Delete
    deleted = delete_test_record(test_db_session, rec.id)
    assert deleted is True

    # Confirm non-existent
    assert get_test_record(test_db_session, rec.id) is None
    assert delete_test_record(test_db_session, rec.id) is False


def test_medical_safety_prohibits_diagnostic_terms():
    """Verify schema rejects diagnostic terms like 'positive' or 'negative'."""
    from pydantic import ValidationError

    dummy_heatmap = json.dumps({"timestamps": []})
    with pytest.raises(ValidationError):
        TestRecordCreate(
            prediction="positive",  # Forbidden diagnostic term!
            probability=0.9,
            threshold_used=0.5,
            audio_duration_sec=4.0,
            attention_heatmap_json=dummy_heatmap,
        )

    with pytest.raises(ValidationError):
        TestRecordCreate(
            prediction="negative",  # Forbidden diagnostic term!
            probability=0.1,
            threshold_used=0.5,
            audio_duration_sec=4.0,
            attention_heatmap_json=dummy_heatmap,
        )
