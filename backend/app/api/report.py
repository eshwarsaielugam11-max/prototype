"""API router for clinical decision support screening reports.

Generates and retrieves structured, safety-governed clinical decision support reports
synthesizing acoustic model outputs with retrieved medical literature grounding.
"""

from typing import Optional
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.db.repository import get_test_record, update_test_record_report
from backend.app.db.session import get_db
from backend.app.schemas.report import Report
from backend.app.services.inference import PredictionResult
from backend.app.services.llm import LLMError
from backend.app.services.report import ReportService

logger = logging.getLogger("parkinsons_platform.api.report")

router = APIRouter(prefix="/report", tags=["Report"])


def _calculate_risk_tier(probability: float, threshold: float) -> str:
    """Classify acoustic risk probability into categorical tier."""
    if probability >= 0.75:
        return "high"
    elif probability >= threshold:
        return "moderate"
    elif probability >= 0.25:
        return "low"
    else:
        return "minimal"


@router.post("/{test_record_id}", response_model=Report, status_code=200)
def generate_clinical_report(
    test_record_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Report:
    """Generate and persist clinical decision support report for an existing test record.

    1. Retrieves the screening TestRecord from SQLite database.
    2. Validates that LLM service is available and configured (returns 503 if offline).
    3. Reconstructs PredictionResult from persisted record.
    4. Orchestrates RAG retrieval and safety-guarded LLM synthesis.
    5. Caches the serialized report into the test record and returns the structured Report.
    """
    record = get_test_record(db, test_record_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Test record '{test_record_id}' not found.",
        )

    # Verify LLM availability
    llm_available = getattr(request.app.state, "llm_available", False)
    if not llm_available:
        raise HTTPException(
            status_code=503,
            detail="LLM service is currently unavailable. Please configure LLM_API_KEY in .env. See docs/LLM_SETUP.md.",
        )

    # Retrieve or instantiate ReportService
    report_service: Optional[ReportService] = getattr(request.app.state, "report_service", None)
    if report_service is None:
        report_service = ReportService(
            rag_service=getattr(request.app.state, "rag_service", None),
            llm_service=getattr(request.app.state, "llm_service", None),
        )

    # Reconstruct PredictionResult
    try:
        attention_dict = json.loads(record.attention_heatmap_json) if record.attention_heatmap_json else {}
    except Exception:
        attention_dict = {}

    risk_tier = _calculate_risk_tier(record.probability, record.threshold_used)
    prediction_obj = PredictionResult(
        prediction=record.prediction,
        probability=record.probability,
        threshold_used=record.threshold_used,
        attention=attention_dict,
        audio_duration_sec=record.audio_duration_sec,
        model_version=record.model_version,
        risk_tier=risk_tier,
    )

    try:
        report = report_service.generate_report(
            prediction=prediction_obj,
            fallback_on_unavailable=False,
        )
    except LLMError as e:
        logger.error("LLM synthesis error while generating report for '%s': %s", test_record_id, e)
        raise HTTPException(
            status_code=503,
            detail=f"LLM synthesis failed: {str(e)}",
        )
    except Exception as e:
        logger.error("Unexpected error during report generation for '%s': %s", test_record_id, e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate clinical decision support report.",
        )

    # Cache report in SQLite record
    try:
        update_test_record_report(
            db=db,
            record_id=str(record.id),
            report_json=report.model_dump_json(),
        )
    except Exception as e:
        logger.error("Failed to cache report JSON for record '%s': %s", test_record_id, e, exc_info=True)
        # Note: report was generated successfully, so return it even if DB write had an issue,
        # but here we log error.

    return report


@router.get("/{test_record_id}", response_model=Report, status_code=200)
def get_cached_report(
    test_record_id: str,
    db: Session = Depends(get_db),
) -> Report:
    """Retrieve previously generated clinical decision support report from cache.

    Returns 404 if the test record does not exist or if the report has not yet been generated.
    """
    record = get_test_record(db, test_record_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Test record '{test_record_id}' not found.",
        )

    if not record.report_json:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Report has not yet been generated for test record '{test_record_id}'. "
                f"Call POST /api/v1/report/{test_record_id} to generate it."
            ),
        )

    try:
        report_data = Report.model_validate_json(record.report_json)
        return report_data
    except Exception as e:
        logger.error("Failed to parse cached report JSON for record '%s': %s", test_record_id, e)
        raise HTTPException(
            status_code=500,
            detail="Stored clinical report is malformed or could not be deserialized.",
        )
