"""API router for acoustic voice screening predictions.

Accepts audio recordings/uploads via multipart/form-data, coordinates acoustic
neural network inference and attention explainability calculation, and persists
the screening outcome to the local SQLite database.
"""

from collections import defaultdict
import json
import logging
import time
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.repository import create_test_record
from backend.app.db.session import get_db
from backend.app.schemas.predict import PredictResponse
from backend.app.schemas.test_record import TestRecordCreate
from backend.app.services.inference import InferenceService

logger = logging.getLogger("parkinsons_platform.api.predict")

router = APIRouter(prefix="/predict", tags=["Screening"])


class InMemoryRateLimiter:
    """Lightweight in-memory sliding window rate limiter per client IP.

    Designed for local/single-user clinical research deployment per 'do not overengineer' principles.
    Prevents client loops/accidental rapid submissions while adding zero external infrastructure dependencies.
    """

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, client_ip: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds
        # Retain timestamps within active sliding window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > window_start]

        if len(self.requests[client_ip]) >= self.max_requests:
            logger.warning(
                "Rate limit exceeded for client IP %s (%d requests in %ds)",
                client_ip,
                self.max_requests,
                self.window_seconds,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded (maximum {self.max_requests} requests per minute). Please wait before submitting additional screening audio.",
            )

        self.requests[client_ip].append(now)


# Global rate limiter instance (30 requests per minute per client host)
predict_rate_limiter = InMemoryRateLimiter(max_requests=30, window_seconds=60)


@router.post("", response_model=PredictResponse, status_code=200)
async def predict_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file in WAV, FLAC, OGG, or MP3 format"),
    test_id: Optional[str] = Form(None, description="Optional patient or test reference identifier"),
    source: str = Form("recording", description="Audio source modality: 'recording' or 'upload'"),
    db: Session = Depends(get_db),
) -> PredictResponse:
    """Run non-diagnostic acoustic screening on an audio sample.

    1. Applies rate-limiting check per client IP.
    2. Validates audio format, size, duration, and energy constraints server-side.
    3. Runs feature extraction via WavLM and classification via the trained acoustic model.
    4. Computes time-aligned attention rollout heatmap.
    5. Persists the screening record into SQLite without persisting raw audio.
    6. Returns prediction classification, continuous probability, and explainability heatmap.
    """
    # 0. Rate limiting check
    client_ip = request.client.host if request.client else "127.0.0.1"
    predict_rate_limiter.check_rate_limit(client_ip)

    # 1. Source modality validation
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
    # validate_audio_file inside inference_service.predict will raise HTTPException(400) on validation failures
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

    # Persist screening record to SQLite (zero raw audio persistence)
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
