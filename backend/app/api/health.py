"""Health check and system status router."""

from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.app.config import Settings, get_settings

router = APIRouter(prefix="/health", tags=["System"])


class HealthResponse(BaseModel):
    """Schema for system health response."""

    status: str = Field(default="ok", description="Overall service status")
    model_artifact_found: bool = Field(
        description="Whether production model.pt and config.json exist on disk"
    )
    timestamp: str = Field(
        description="ISO 8601 timestamp in UTC when the health check was performed"
    )


@router.get("", response_model=HealthResponse, summary="Service Health & Model Check")
def check_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Return application operational status and verify ML artifact presence."""
    artifact_dir = Path(settings.model_artifact_dir)
    model_path = artifact_dir / "model.pt"
    config_path = artifact_dir / "config.json"

    # Also check best_model.pt as valid artifact state
    fallback_model_path = artifact_dir / "best_model.pt"
    model_exists = model_path.exists() or fallback_model_path.exists()
    config_exists = config_path.exists()

    artifact_found = bool(model_exists and config_exists)

    return HealthResponse(
        status="ok",
        model_artifact_found=artifact_found,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
