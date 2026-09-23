"""API router for screening history queries.

Provides paginated summary listings of historical screening sessions
and detailed retrieval of individual test records.
"""

from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db.repository import get_test_record, list_test_records
from backend.app.db.session import get_db
from backend.app.schemas.test_record import TestRecordListItem, TestRecordResponse

logger = logging.getLogger("parkinsons_platform.api.history")

router = APIRouter(prefix="/history", tags=["History"])


@router.get("", response_model=List[TestRecordListItem], status_code=200)
def get_screening_history(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of historical records to return"),
    offset: int = Query(0, ge=0, description="Number of historical records to skip"),
    db: Session = Depends(get_db),
) -> List[TestRecordListItem]:
    """Retrieve chronological list of past screening runs (newest first).

    Returns lightweight summaries suitable for tabular or list view display.
    """
    records = list_test_records(db=db, limit=limit, offset=offset)
    results: List[TestRecordListItem] = []
    for r in records:
        has_report = bool(r.report_json is not None and len(r.report_json.strip()) > 0)
        results.append(
            TestRecordListItem(
                id=str(r.id),
                created_at=r.created_at,
                test_id=r.test_id,
                source=r.source,
                prediction=r.prediction,
                probability=r.probability,
                threshold_used=r.threshold_used,
                audio_duration_sec=r.audio_duration_sec,
                model_version=r.model_version,
                has_report=has_report,
            )
        )
    return results


@router.get("/{test_record_id}", response_model=TestRecordResponse, status_code=200)
def get_screening_record_detail(
    test_record_id: str,
    db: Session = Depends(get_db),
) -> TestRecordResponse:
    """Retrieve complete record details for a single screening session.

    Includes full attention rollout heatmap data and generated clinical report (if available).
    """
    record = get_test_record(db=db, record_id=test_record_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Test record '{test_record_id}' not found.",
        )

    has_report = bool(record.report_json is not None and len(record.report_json.strip()) > 0)
    return TestRecordResponse(
        id=str(record.id),
        created_at=record.created_at,
        test_id=record.test_id,
        source=record.source,
        prediction=record.prediction,
        probability=record.probability,
        threshold_used=record.threshold_used,
        audio_duration_sec=record.audio_duration_sec,
        model_version=record.model_version,
        has_report=has_report,
        attention_heatmap_json=record.attention_heatmap_json,
        report_json=record.report_json,
    )
