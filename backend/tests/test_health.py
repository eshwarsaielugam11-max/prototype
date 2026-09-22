"""Unit and integration tests for FastAPI application entrypoint and health router."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture
def client():
    """Create test client with fresh app instance."""
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


def test_root_index_endpoint(client):
    """Verify root index endpoint responds with 200 and API metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Parkinson's Disease Voice Screening Platform API"
    assert data["version"] == "1.0.0"
    assert "health" in data
    assert "docs" in data


def test_health_check_endpoint(client):
    """Verify /api/v1/health endpoint adheres to contract."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "model_artifact_found" in data
    assert isinstance(data["model_artifact_found"], bool)
    assert data["model_artifact_found"] is True, "model.pt and config.json must exist in models/artifact/"
    assert "timestamp" in data
    assert "T" in data["timestamp"]  # ISO8601 string
    assert "X-Request-ID" in response.headers


def test_cors_headers(client):
    """Verify CORS preflight allows requests from frontend dev origin."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-Request-ID",
    }
    response = client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_unhandled_exception_shield(client):
    """Verify unhandled exceptions return clean JSON with request_id and no leaked stack trace."""
    app = client.app

    @app.get("/api/v1/test-crash")
    def trigger_crash():
        raise RuntimeError("Secret internal database password leaked in exception message")

    response = client.get("/api/v1/test-crash")
    assert response.status_code == 500
    data = response.json()

    assert data["error"] == "Internal Server Error"
    assert "Secret internal database password" not in data["message"]
    assert "request_id" in data
    assert len(data["request_id"]) > 0
    assert response.headers.get("X-Request-ID") == data["request_id"]
