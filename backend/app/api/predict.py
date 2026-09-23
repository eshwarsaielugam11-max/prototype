"""API router for acoustic voice screening predictions.

Accepts audio recordings/uploads via multipart/form-data, coordinates acoustic
neural network inference and attention explainability calculation, and persists
the screening outcome to the local SQLite database.
"""

from typing import Optional
import json
import logging
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.repository import create_test_record
from backend.app.db.session import get_db
from backend.app.schemas.predict import PredictResponse
from backend.app.schemas.test_record import TestRecordCreate
from backend.app.services.inference import InferenceService

logger = logging.getLogger("parkinsons_platform.api.predict")

router = APIRouter(prefix="/predict", tags=["Screening"])


@router.post("", response_model=PredictResponse, status_code=200)
async def predict_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file in WAV, FLAC, OGG, or MP3 format"),
    test_id: Optional[str] = Form(None, description="Optional patient or test reference identifier"),
    source: str = Form("recording", description="Audio source modality: 'recording' or 'upload'"),
    db: Session = Depends(get_db),
) -> PredictResponse:
    """Run non-diagnostic acoustic screening on an audio sample.

    1. Validates audio format, size, duration, and energy constraints.
    2. Runs feature extraction via WavLM and classification via the trained acoustic model.
    3. Computes time-aligned attention rollout heatmap.
    4. Persists the screening record into the database.
    5. Returns prediction classification, continuous probability, and explainability heatmap.
    """
    normalized_source = source.strip().lower() if source else "recording"
    if normalized_source not in ("recording", "upload"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{source}'. Permitted sources: 'recording', 'upload'.",
        )

    # Clean patient/test identifier
    clean_test_id = test_id.strip() if test_id and test_id.strip() else None

    # Retrieve loaded inference service singleton from application state
    inference_service: Optional[InferenceService] = getattr(
        request.app.state, "inference_service", None
    )
    if inference_service is None:
        logger.error("InferenceService instance is not loaded in app.state.")
        raise HTTPException(
            status_code=503,
            detail="Inference service is currently unavailable. Acoustic model artifacts could not be loaded.",
        )

    filename = file.filename or "recording.wav"

    try:
        audio_bytes = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded audio bytes: %s", e)
        raise HTTPException(
            status_code=400,
            detail="Failed to read uploaded audio stream.",
        )

    # Execute acoustic inference & explainability
    # validate_audio_file inside inference_service.predict will raise HTTPException(400) if validation fails
    try:
        prediction_result = inference_service.predict(
            audio_bytes=audio_bytes,
            filename=filename,
        )
    except HTTPException:
        # Re-raise standard HTTPExceptions (e.g. 400 validation failures) cleanly
        raise
    except Exception as e:
        logger.error("Acoustic inference failed unexpectedly: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal error occurred while executing acoustic screening inference.",
        )

    # Persist screening record to SQLite
    record_in = TestRecordCreate(
        test_id=clean_test_id,
        source=normalized_source,  # type: ignore[arg-type]
        prediction=prediction_result.prediction,  # type: ignore[arg-type]
        probability=prediction_result.probability,
        threshold_used=prediction_result.threshold_used,
        audio_duration_sec=prediction_result.audio_duration_sec,
        model_version=prediction_result.model_version,
        attention_heatmap_json=json.dumps(prediction_result.attention),
        report_json=None,
    )

    try:
        db_record = create_test_record(db=db, record_in=record_in)
    except Exception as e:
        logger.error("Failed to persist screening test record to database: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to persist screening record to database.",
        )

    return PredictResponse(
        test_record_id=str(db_record.id),
        prediction=prediction_result.prediction,
        probability=prediction_result.probability,
        threshold_used=prediction_result.threshold_used,
        attention=prediction_result.attention,
    )
