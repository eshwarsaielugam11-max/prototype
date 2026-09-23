"""Pydantic schemas for acoustic screening prediction endpoints.

Defines the response contract returned immediately upon completing
neural network inference and attention rollout computation.
"""

from typing import Any, Dict
from pydantic import BaseModel, Field


class PredictResponse(BaseModel):
    """Screening outcome returned immediately after acoustic inference."""

    test_record_id: str = Field(
        ...,
        description="UUID primary key of the persisted test record in SQLite database",
    )
    prediction: str = Field(
        ...,
        description="Clinical screening outcome: 'parkinsons_risk_indicated' or 'low_risk_indicated'",
    )
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Continuous model risk score in range [0.0, 1.0]",
    )
    threshold_used: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Operational decision threshold applied for classification",
    )
    attention: Dict[str, Any] = Field(
        ...,
        description="Time-aligned attention rollout heatmap dictionary for explainability visualization",
    )
