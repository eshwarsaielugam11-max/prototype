"""Pydantic schemas for screening test records.

Provides validation, serialization, and response schemas for recording creation,
detailed responses, and lightweight history list views.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

PredictionType = Literal["parkinsons_risk_indicated", "low_risk_indicated"]
SourceType = Literal["recording", "upload"]


class TestRecordBase(BaseModel):
    """Base schema attributes shared across test record schemas."""

    __test__ = False

    test_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional clinician or patient reference identifier",
    )
    source: SourceType = Field(
        default="recording",
        description="Audio ingestion modality: 'recording' (live mic) or 'upload' (file)",
    )
    prediction: PredictionType = Field(
        description="Clinical risk category: 'parkinsons_risk_indicated' or 'low_risk_indicated'",
    )
    probability: float = Field(
        ge=0.0,
        le=1.0,
        description="Continuous model risk score in range [0.0, 1.0]",
    )
    threshold_used: float = Field(
        description="Decision threshold applied for risk categorization (e.g. 0.55)",
    )
    audio_duration_sec: float = Field(
        ge=0.0,
        description="Total duration of audio segment analyzed in seconds",
    )
    model_version: str = Field(
        default="colab-t4-run-20260922",
        description="Model architecture and training checkpoint identifier",
    )


class TestRecordCreate(TestRecordBase):
    """Schema for inserting a new screening test record into persistence."""

    __test__ = False

    attention_heatmap_json: str = Field(
        description="JSON-serialized time-aligned attention rollout heatmap dictionary",
    )
    report_json: Optional[str] = Field(
        default=None,
        description="JSON-serialized clinical decision support report (nullable initially)",
    )


class TestRecordListItem(BaseModel):
    """Lightweight summary schema for history list view (omits heavy JSON blobs)."""

    __test__ = False
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="UUID string primary key")
    created_at: datetime = Field(description="UTC timestamp of screening")
    test_id: Optional[str] = Field(default=None, description="Optional patient/test identifier")
    source: str = Field(description="Source modality: 'recording' or 'upload'")
    prediction: str = Field(description="Screening outcome: 'parkinsons_risk_indicated' or 'low_risk_indicated'")
    probability: float = Field(description="Risk probability score [0.0, 1.0]")
    threshold_used: float = Field(description="Threshold used during screening")
    audio_duration_sec: float = Field(description="Audio duration in seconds")
    model_version: str = Field(description="Model artifact version")
    has_report: bool = Field(default=False, description="Whether clinical report has been generated")


class TestRecordResponse(TestRecordListItem):
    """Full detail schema including explainability heatmap and clinical report payloads."""

    __test__ = False
    model_config = ConfigDict(from_attributes=True)

    attention_heatmap_json: str = Field(
        description="JSON-serialized time-aligned attention rollout heatmap dictionary"
    )
    report_json: Optional[str] = Field(
        default=None,
        description="JSON-serialized clinical decision support report structure",
    )
