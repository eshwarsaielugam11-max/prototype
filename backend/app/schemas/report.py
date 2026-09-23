"""Pydantic schemas for clinical decision support screening reports.

Defines the fixed, safety-reviewed data contract returned by the /report endpoint
and consumed by the frontend clinical review interface.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ModelPredictionSummary(BaseModel):
    """Model prediction outcome directly from acoustic neural network (untouched by LLM)."""

    prediction: str = Field(
        ...,
        description="Screening risk classification: 'parkinsons_risk_indicated' or 'low_risk_indicated'",
    )
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Continuous probability score of elevated Parkinson's acoustic risk [0.0, 1.0]",
    )
    threshold_used: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Operational decision threshold applied for classification (e.g. 0.55)",
    )


class EvidenceChunk(BaseModel):
    """Authoritative educational knowledge base passage retrieved for context grounding."""

    text: str = Field(
        ...,
        description="Verbatim passage from curated knowledge base",
    )
    source_name: str = Field(
        ...,
        description="Authoritative source organization or peer-reviewed publication",
    )
    source_url: Optional[str] = Field(
        default=None,
        description="Verifiable reference URL if available, otherwise None",
    )


class GeneratedExplanation(BaseModel):
    """AI-synthesized educational narrative strictly grounded in retrieved evidence."""

    screening_summary: str = Field(
        ...,
        description="Plain-language interpretation of the numerical acoustic score (2-4 sentences)",
    )
    explanation: str = Field(
        ...,
        description="Grounded explanation of characteristic vocal patterns and clinical context (2-4 sentences)",
    )


class Report(BaseModel):
    """Structured, safety-separated clinical decision support report object."""

    model_prediction: ModelPredictionSummary = Field(
        ...,
        description="Raw neural network screening outcome and probability (untouched by LLM)",
    )
    retrieved_evidence: List[EvidenceChunk] = Field(
        ...,
        description="Curated educational evidence passages retrieved via RAG (untouched by LLM)",
    )
    generated_explanation: GeneratedExplanation = Field(
        ...,
        description="Grounded clinical explanation synthesized by LLM",
    )
    clinical_disclaimer: str = Field(
        ...,
        description="Fixed, non-modifiable legal and clinical safety disclaimer",
    )
