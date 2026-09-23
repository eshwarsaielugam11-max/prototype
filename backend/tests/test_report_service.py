"""Unit and integration tests for ReportService and clinical safety guardrails."""

import json
from unittest.mock import MagicMock
import pytest

from backend.app.schemas.report import EvidenceChunk, Report
from backend.app.services.inference import PredictionResult
from backend.app.services.llm import LLMError
from backend.app.services.rag import RetrievedChunk
from backend.app.services.report import (
    CLINICAL_DISCLAIMER,
    FORBIDDEN_DIAGNOSTIC_PHRASES,
    SAFE_FALLBACK_EXPLANATION,
    ReportService,
    get_report_service,
)


@pytest.fixture
def sample_pd_prediction() -> PredictionResult:
    """Fixture providing a sample Parkinson's risk indicated prediction."""
    return PredictionResult(
        prediction="parkinsons_risk_indicated",
        probability=0.7850,
        threshold_used=0.5500,
        attention={"timestamps_sec": [0.0, 1.0], "attention": [0.2, 0.8]},
        audio_duration_sec=4.0,
        model_version="colab-t4-run-20260922",
        risk_tier="high",
    )


@pytest.fixture
def sample_healthy_prediction() -> PredictionResult:
    """Fixture providing a sample low risk indicated prediction."""
    return PredictionResult(
        prediction="low_risk_indicated",
        probability=0.1820,
        threshold_used=0.5500,
        attention={"timestamps_sec": [0.0, 1.0], "attention": [0.1, 0.1]},
        audio_duration_sec=3.8,
        model_version="colab-t4-run-20260922",
        risk_tier="minimal",
    )


@pytest.fixture
def mock_rag_service():
    """Mock RAG service returning 4 evidence chunks."""
    service = MagicMock()
    service.retrieve.return_value = [
        RetrievedChunk(
            text="Hypophonia and reduced vocal loudness are common early speech signs in Parkinson's.",
            source_name="Parkinson's Foundation",
            source_url="https://www.parkinson.org/speech",
            similarity_score=0.88,
        ),
        RetrievedChunk(
            text="Acoustic features such as pitch variability and harmonics-to-noise ratio indicate vocal stability.",
            source_name="Movement Disorders Review",
            source_url=None,
            similarity_score=0.84,
        ),
        RetrievedChunk(
            text="Voice changes can also stem from temporary vocal strain, fatigue, or respiratory infection.",
            source_name="FDA Digital Health Guidance",
            source_url="https://www.fda.gov/digital-health",
            similarity_score=0.81,
        ),
        RetrievedChunk(
            text="A thorough clinical examination by a neurologist remains the definitive diagnostic gold standard.",
            source_name="NIH / NINDS",
            source_url="https://www.ninds.nih.gov/pd",
            similarity_score=0.79,
        ),
    ]
    return service


def test_generate_report_pd_risk_indicated(sample_pd_prediction, mock_rag_service):
    """Verify complete report structure and non-diagnostic language for elevated risk outcome."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")
    mock_llm.generate.return_value = json.dumps({
        "screening_summary": "The acoustic model computed an estimated risk probability of 0.7850, exceeding the 0.5500 threshold.",
        "explanation": "According to the Parkinson's Foundation, reduced vocal loudness and pitch changes are recognized characteristics of hypokinetic dysarthria.",
    })

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    # 1. Assert Report type and all four top-level fields
    assert isinstance(report, Report)
    assert report.model_prediction is not None
    assert report.retrieved_evidence is not None
    assert report.generated_explanation is not None
    assert report.clinical_disclaimer is not None

    # 2. Verify model prediction integrity (untouched by LLM)
    assert report.model_prediction.prediction == "parkinsons_risk_indicated"
    assert report.model_prediction.probability == 0.7850
    assert report.model_prediction.threshold_used == 0.5500

    # 3. Verify retrieved evidence integrity
    assert len(report.retrieved_evidence) == 4
    assert report.retrieved_evidence[0].source_name == "Parkinson's Foundation"

    # 4. Verify generated explanation
    assert "0.7850" in report.generated_explanation.screening_summary
    assert "Parkinson's Foundation" in report.generated_explanation.explanation

    # 5. Verify clinical disclaimer is byte-identical to constant
    assert report.clinical_disclaimer == CLINICAL_DISCLAIMER


def test_generate_report_low_risk_indicated(sample_healthy_prediction, mock_rag_service):
    """Verify complete report structure for low risk outcome."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")
    mock_llm.generate.return_value = json.dumps({
        "screening_summary": "The acoustic model computed an estimated risk score of 0.1820, remaining well below the 0.5500 threshold.",
        "explanation": "Voice metrics align with typical acoustic stability parameters documented in neurological speech research.",
    })

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_healthy_prediction)

    assert report.model_prediction.prediction == "low_risk_indicated"
    assert report.model_prediction.probability == 0.1820
    assert report.clinical_disclaimer == CLINICAL_DISCLAIMER
    assert len(report.retrieved_evidence) == 4


def test_clinical_disclaimer_is_byte_identical_regardless_of_llm_output(sample_pd_prediction, mock_rag_service):
    """Verify that clinical_disclaimer cannot be modified, shortened, or influenced by LLM output."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")
    # Even if LLM response tries to insert a custom disclaimer
    mock_llm.generate.return_value = json.dumps({
        "screening_summary": "Screening summary text.",
        "explanation": "Educational explanation citing literature.",
        "clinical_disclaimer": "MALICIOUS OVERWRITE ATTEMPT",
    })

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    assert report.clinical_disclaimer == CLINICAL_DISCLAIMER
    assert "MALICIOUS OVERWRITE ATTEMPT" not in report.clinical_disclaimer
    assert bytes(report.clinical_disclaimer, "utf-8") == bytes(CLINICAL_DISCLAIMER, "utf-8")


def test_safety_blocklist_catches_forbidden_diagnostic_phrases(sample_pd_prediction, mock_rag_service):
    """Verify defense-in-depth safety check detects forbidden diagnostic language and substitutes safe fallback."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")

    # Deliberately inject forbidden phrases from the blocklist
    mock_llm.generate.return_value = json.dumps({
        "screening_summary": "This result proves that you have Parkinson's disease and are diagnosed with it.",
        "explanation": "The audio confirms a positive diagnosis of neuropathology.",
    })

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    # Output should have been intercepted and replaced by safe fallback
    summary_lower = report.generated_explanation.screening_summary.lower()
    explanation_lower = report.generated_explanation.explanation.lower()

    for phrase in FORBIDDEN_DIAGNOSTIC_PHRASES:
        assert phrase not in summary_lower, f"Forbidden phrase '{phrase}' found in screening summary!"
        assert phrase not in explanation_lower, f"Forbidden phrase '{phrase}' found in explanation!"

    # Verify fallback text is present
    safe_expected = SAFE_FALLBACK_EXPLANATION["parkinsons_risk_indicated"]
    assert report.generated_explanation.screening_summary == safe_expected["screening_summary"]
    assert report.generated_explanation.explanation == safe_expected["explanation"]


def test_defensive_parsing_markdown_code_fences(sample_pd_prediction, mock_rag_service):
    """Verify parser extracts JSON wrapped inside markdown ```json ... ``` code blocks."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")
    mock_llm.generate.return_value = (
        "```json\n"
        "{\n"
        '  "screening_summary": "Clean summary text.",\n'
        '  "explanation": "Clean explanation text."\n'
        "}\n"
        "```"
    )

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    assert report.generated_explanation.screening_summary == "Clean summary text."
    assert report.generated_explanation.explanation == "Clean explanation text."


def test_defensive_parsing_retry_recovers_from_initial_malformed_json(sample_pd_prediction, mock_rag_service):
    """Verify service attempts one retry when initial LLM response is not valid JSON."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")

    # First call: malformed non-JSON
    # Second call (retry): valid JSON
    mock_llm.generate.side_effect = [
        "Sure, here is the report: screening summary is good and explanation is clear.",
        json.dumps({
            "screening_summary": "Recovered summary on retry.",
            "explanation": "Recovered explanation on retry.",
        }),
    ]

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    assert mock_llm.generate.call_count == 2
    assert report.generated_explanation.screening_summary == "Recovered summary on retry."
    assert report.generated_explanation.explanation == "Recovered explanation on retry."


def test_defensive_parsing_falls_back_when_all_retries_fail(sample_pd_prediction, mock_rag_service):
    """Verify service uses verified safe fallback if parsing fails even after retry without crashing."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Ready")
    # Both attempts fail to return JSON
    mock_llm.generate.side_effect = ["Invalid text 1", "Invalid text 2"]

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)
    report = service.generate_report(sample_pd_prediction)

    assert report is not None
    safe_expected = SAFE_FALLBACK_EXPLANATION["parkinsons_risk_indicated"]
    assert report.generated_explanation.screening_summary == safe_expected["screening_summary"]


def test_llm_unavailable_graceful_degradation(sample_pd_prediction, mock_rag_service):
    """Verify service handles LLM unavailability gracefully without crashing."""
    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (False, "LLM_API_KEY missing in .env")

    service = ReportService(rag_service=mock_rag_service, llm_service=mock_llm)

    # 1. With fallback_on_unavailable=True (default): returns report with safe text
    report = service.generate_report(sample_pd_prediction, fallback_on_unavailable=True)
    assert isinstance(report, Report)
    assert report.clinical_disclaimer == CLINICAL_DISCLAIMER
    assert report.model_prediction.probability == 0.7850
    assert report.generated_explanation.screening_summary == SAFE_FALLBACK_EXPLANATION["parkinsons_risk_indicated"]["screening_summary"]

    # 2. With fallback_on_unavailable=False: raises LLMError for 503 HTTP responses
    with pytest.raises(LLMError) as exc_info:
        service.generate_report(sample_pd_prediction, fallback_on_unavailable=False)
    assert "LLM service is unavailable" in str(exc_info.value)


def test_get_report_service_dependency():
    """Verify get_report_service dependency wires RAG and LLM services from request.app.state."""
    class DummyApp:
        class State:
            rag_service = "mock_rag"
            llm_service = "mock_llm"
        state = State()

    class DummyRequest:
        app = DummyApp()

    service = get_report_service(DummyRequest())
    assert service.rag_service == "mock_rag"
    assert service.llm_service == "mock_llm"
