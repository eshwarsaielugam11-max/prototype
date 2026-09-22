"""SQLAlchemy ORM model for screening test records.

Stores acoustic screening predictions, clinical explainability heatmaps,
and generated clinical decision support reports.

MEDICAL SAFETY NOTICE:
In compliance with non-diagnostic clinical decision support design principles,
prediction outcomes are strictly encoded as 'parkinsons_risk_indicated' or
'low_risk_indicated'. Diagnostic terms ('positive', 'negative', 'diagnosed') are
strictly prohibited in column definitions and clinical outputs.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, Float, Index, String, Text

from backend.app.db.session import Base


class TestRecord(Base):
    """SQLAlchemy model representing an acoustic voice screening run."""

    __tablename__ = "test_records"
    __test__ = False  # Prevent pytest from mistaking this ORM class as a test suite

    # Unique record identifier (UUID4 string)
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
        doc="Primary key UUID string",
    )

    # Timestamp of test execution
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
        doc="UTC timestamp when the screening run was created",
    )

    # Optional user/clinician supplied patient or session tracking identifier
    test_id = Column(
        String(100),
        nullable=True,
        index=True,
        doc="Optional user/clinician provided patient or session identifier",
    )

    # Ingestion source: "recording" (live microphone) or "upload" (audio file)
    source = Column(
        String(20),
        nullable=False,
        default="recording",
        doc="Ingestion source modality: 'recording' or 'upload'",
    )

    # Clinical screening outcome: 'parkinsons_risk_indicated' | 'low_risk_indicated'
    prediction = Column(
        String(50),
        nullable=False,
        index=True,
        doc="Screening risk classification: 'parkinsons_risk_indicated' or 'low_risk_indicated'",
    )

    # Calibrated prediction probability score [0.0, 1.0]
    probability = Column(
        Float,
        nullable=False,
        doc="Model output probability of elevated Parkinson's acoustic risk [0.0, 1.0]",
    )

    # Operational decision threshold applied for binary risk bifurcation (e.g. 0.55)
    threshold_used = Column(
        Float,
        nullable=False,
        doc="Classification threshold applied to probability score",
    )

    # Duration of input audio segment in seconds
    audio_duration_sec = Column(
        Float,
        nullable=False,
        doc="Duration of the audio recording in seconds",
    )

    # JSON-serialized attention rollout heatmap dictionary ({timestamps_sec: [...], attention: [...]})
    attention_heatmap_json = Column(
        Text,
        nullable=False,
        doc="JSON-serialized temporal attention rollout heatmap dictionary",
    )

    # JSON-serialized clinical decision support report (nullable until LLM synthesis finishes)
    report_json = Column(
        Text,
        nullable=True,
        doc="JSON-serialized clinical decision support report structure",
    )

    # Model artifact provenance tag (e.g. training_run_id from config.json)
    model_version = Column(
        String(100),
        nullable=False,
        default="colab-t4-run-20260922",
        doc="Training run identifier and model artifact version string",
    )

    # Composite index for chronologically ordered queries
    __table_args__ = (
        Index("ix_test_records_created_desc", created_at.desc()),
    )

    def __repr__(self) -> str:
        return (
            f"<TestRecord id={self.id} test_id={self.test_id} "
            f"prediction={self.prediction} prob={self.probability:.4f} created_at={self.created_at}>"
        )
