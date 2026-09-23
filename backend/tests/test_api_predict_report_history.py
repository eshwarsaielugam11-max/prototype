"""Integration and contract tests for /predict, /report, and /history API endpoints.

Tests end-to-end request/response cycles via FastAPI TestClient, in-memory SQLite isolation,
mocked LLM generation, safety fallback, error handling, and validation contracts.
"""

from pathlib import Path
from unittest.mock import MagicMock
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db.repository import create_test_record, get_test_record
from backend.app.db.session import Base, get_db
from backend.app.main import create_app
from backend.app.schemas.test_record import TestRecordCreate
from backend.app.services.rag import RetrievedChunk

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def test_engine():
    """Create a persistent in-memory SQLite engine with StaticPool for the session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def SessionTesting(test_engine):
    """Session factory bound to the StaticPool in-memory test engine."""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session")
def client(test_engine, SessionTesting):
    """Session-scoped TestClient running startup lifespan once."""
    app = create_app()

    def override_get_db():
        db = SessionTesting()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clean_db_and_state(test_engine, client):
    """Wipe database rows and restore clean app.state before/after each test."""
    with test_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()

    # Reset default test state
    client.app.state.llm_available = True
    yield
    client.app.state.llm_available = True


@pytest.fixture
def db_session(SessionTesting):
    """Provide an isolated database session for direct inspection in tests."""
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_audio_bytes() -> bytes:
    """Load sample PD wav fixture bytes."""
    wav_path = FIXTURES_DIR / "sample_pd.wav"
    assert wav_path.exists(), f"Fixture missing: {wav_path}"
    with open(wav_path, "rb") as f:
        return f.read()


def test_predict_success_with_valid_wav(client, db_session, sample_audio_bytes):
    """Test POST /api/v1/predict with valid audio creates record and returns prediction."""
    files = {"file": ("sample_pd.wav", sample_audio_bytes, "audio/wav")}
    data = {
        "test_id": "CLINICAL-TEST-001",
        "source": "upload",
    }

    response = client.post("/api/v1/predict", files=files, data=data)
    assert response.status_code == 200, f"Predict failed: {response.text}"

    body = response.json()
    assert "test_record_id" in body
    assert body["prediction"] in ("parkinsons_risk_indicated", "low_risk_indicated")
    assert 0.0 <= body["probability"] <= 1.0
    assert body["threshold_used"] == 0.55
    assert "attention" in body
    assert "timestamps_sec" in body["attention"]
    assert "attention" in body["attention"]

    # Verify database persistence
    record = get_test_record(db_session, body["test_record_id"])
    assert record is not None
    assert record.test_id == "CLINICAL-TEST-001"
    assert record.source == "upload"
    assert record.prediction == body["prediction"]
    assert record.probability == body["probability"]
    assert record.report_json is None


def test_predict_rejects_invalid_audio_format(client):
    """Test POST /api/v1/predict rejects non-audio file with 400 error."""
    files = {"file": ("notes.txt", b"plain text notes", "text/plain")}
    response = client.post("/api/v1/predict", files=files)

    assert response.status_code == 400
    body = response.json()
    assert "detail" in body
    assert "Unsupported audio format" in body["detail"]


def test_predict_rejects_invalid_source(client, sample_audio_bytes):
    """Test POST /api/v1/predict rejects invalid source modality with 400 error."""
    files = {"file": ("sample_pd.wav", sample_audio_bytes, "audio/wav")}
    data = {"source": "satellite"}

    response = client.post("/api/v1/predict", files=files, data=data)
    assert response.status_code == 400
    body = response.json()
    assert "Invalid source" in body["detail"]


def test_report_generation_when_llm_unavailable(client, db_session):
    """Test POST /api/v1/report/{id} returns 503 with setup instructions when LLM is offline."""
    record_in = TestRecordCreate(
        test_id="TEST-UNAVAIL",
        source="recording",
        prediction="parkinsons_risk_indicated",
        probability=0.79,
        threshold_used=0.55,
        audio_duration_sec=3.5,
        model_version="colab-t4-run-20260922",
        attention_heatmap_json=json.dumps({"timestamps_sec": [0.0, 1.0], "attention": [0.3, 0.7]}),
        report_json=None,
    )
    record = create_test_record(db_session, record_in)
    record_id = str(record.id)

    # Simulate LLM offline
    client.app.state.llm_available = False

    response = client.post(f"/api/v1/report/{record_id}")
    assert response.status_code == 503
    body = response.json()
    assert "LLM service is currently unavailable" in body["detail"]
    assert "docs/LLM_SETUP.md" in body["detail"]


def test_report_generation_and_caching_with_mocked_llm(client, db_session):
    """Test POST /api/v1/report/{id} successfully generates, returns, and caches report."""
    record_in = TestRecordCreate(
        test_id="TEST-REPORT-GEN",
        source="recording",
        prediction="parkinsons_risk_indicated",
        probability=0.824,
        threshold_used=0.55,
        audio_duration_sec=4.0,
        model_version="colab-t4-run-20260922",
        attention_heatmap_json=json.dumps({"timestamps_sec": [0.0, 1.0], "attention": [0.4, 0.6]}),
        report_json=None,
    )
    record = create_test_record(db_session, record_in)
    record_id = str(record.id)

    client.app.state.llm_available = True

    mock_llm = MagicMock()
    mock_llm.check_availability.return_value = (True, "Mocked LLM operational")
    mock_llm.generate.return_value = json.dumps({
        "screening_summary": "The model detected vocal markers consistent with elevated acoustic risk (82.4%).",
        "explanation": "Hypophonia and reduced fundamental frequency variability were detected, referencing Parkinson's Foundation literature.",
    })

    mock_rag = MagicMock()
    mock_rag.retrieve.return_value = [
        RetrievedChunk(
            text="Hypophonia and reduced vocal volume are hallmark early voice changes.",
            source_name="Parkinson's Foundation",
            source_url="https://www.parkinson.org",
            similarity_score=0.91,
        )
    ]

    from backend.app.services.report import ReportService
    if getattr(client.app.state, "report_service", None) is None:
        client.app.state.report_service = ReportService()

    client.app.state.report_service.llm_service = mock_llm
    client.app.state.report_service.rag_service = mock_rag

    # 1. POST /report/{id} generates report
    post_resp = client.post(f"/api/v1/report/{record_id}")
    assert post_resp.status_code == 200, f"Report generation failed: {post_resp.text}"

    report_data = post_resp.json()
    assert report_data["model_prediction"]["prediction"] == "parkinsons_risk_indicated"
    assert report_data["model_prediction"]["probability"] == 0.824
    assert len(report_data["retrieved_evidence"]) == 1
    assert "Hypophonia" in report_data["generated_explanation"]["explanation"]
    assert "NOTICE: This report is generated" in report_data["clinical_disclaimer"]

    # 2. GET /report/{id} retrieves cached report
    get_resp = client.get(f"/api/v1/report/{record_id}")
    assert get_resp.status_code == 200
    cached_data = get_resp.json()
    assert cached_data == report_data

    # 3. Check DB record has cached report_json
    db_session.expire_all()
    updated = get_test_record(db_session, record_id)
    assert updated.report_json is not None
    assert json.loads(updated.report_json)["model_prediction"]["prediction"] == "parkinsons_risk_indicated"


def test_get_report_returns_404_before_generation(client, db_session):
    """Test GET /api/v1/report/{id} returns 404 when report has not yet been generated."""
    record_in = TestRecordCreate(
        test_id="TEST-NO-REPORT",
        source="upload",
        prediction="low_risk_indicated",
        probability=0.21,
        threshold_used=0.55,
        audio_duration_sec=3.2,
        model_version="colab-t4-run-20260922",
        attention_heatmap_json=json.dumps({"timestamps_sec": [0.0], "attention": [0.1]}),
        report_json=None,
    )
    record = create_test_record(db_session, record_in)
    record_id = str(record.id)

    response = client.get(f"/api/v1/report/{record_id}")
    assert response.status_code == 404
    body = response.json()
    assert "Report has not yet been generated" in body["detail"]


def test_history_list_and_detail_endpoints(client, db_session):
    """Test GET /api/v1/history and GET /api/v1/history/{id} contracts."""
    created_ids = []
    for idx in range(3):
        has_rep = (idx == 1)
        rep_content = json.dumps({"status": "cached_report"}) if has_rep else None
        rec = create_test_record(
            db_session,
            TestRecordCreate(
                test_id=f"PATIENT-{idx:03d}",
                source="recording" if idx % 2 == 0 else "upload",
                prediction="low_risk_indicated" if idx == 0 else "parkinsons_risk_indicated",
                probability=0.2 + (idx * 0.3),
                threshold_used=0.55,
                audio_duration_sec=3.0 + idx,
                model_version="colab-t4-run-20260922",
                attention_heatmap_json=json.dumps({"idx": idx}),
                report_json=rep_content,
            ),
        )
        created_ids.append(str(rec.id))

    # 1. GET /history list
    list_resp = client.get("/api/v1/history?limit=10&offset=0")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 3

    # Check ordering (newest first)
    assert items[0]["id"] == created_ids[2]
    assert items[1]["id"] == created_ids[1]
    assert items[2]["id"] == created_ids[0]

    # Check summary fields (attention_heatmap_json should NOT be in summary list items)
    assert "attention_heatmap_json" not in items[0]
    assert "has_report" in items[0]
    assert items[0]["has_report"] is False
    assert items[1]["has_report"] is True

    # 2. GET /history/{id} detail
    detail_resp = client.get(f"/api/v1/history/{created_ids[1]}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["id"] == created_ids[1]
    assert detail_data["test_id"] == "PATIENT-001"
    assert detail_data["has_report"] is True
    assert "attention_heatmap_json" in detail_data
    assert json.loads(detail_data["attention_heatmap_json"]) == {"idx": 1}
    assert detail_data["report_json"] is not None

    # 3. GET /history/{nonexistent} -> 404
    non_existent = "00000000-0000-0000-0000-000000000000"
    missing_resp = client.get(f"/api/v1/history/{non_existent}")
    assert missing_resp.status_code == 404
    assert f"Test record '{non_existent}' not found" in missing_resp.json()["detail"]


def test_report_endpoints_nonexistent_record(client):
    """Test POST and GET /report/{id} with nonexistent ID return 404."""
    non_existent = "11111111-2222-3333-4444-555555555555"

    # POST nonexistent
    post_resp = client.post(f"/api/v1/report/{non_existent}")
    assert post_resp.status_code == 404
    assert f"Test record '{non_existent}' not found" in post_resp.json()["detail"]

    # GET nonexistent
    get_resp = client.get(f"/api/v1/report/{non_existent}")
    assert get_resp.status_code == 404
    assert f"Test record '{non_existent}' not found" in get_resp.json()["detail"]
