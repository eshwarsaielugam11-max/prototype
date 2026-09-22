"""Unit and integration tests for InferenceService and PredictionResult."""

from pathlib import Path
import os
import tempfile
from fastapi import HTTPException
import numpy as np
import pytest
import soundfile as sf
import torch

from backend.app.config import get_settings
from backend.app.services.inference import (
    InferenceService,
    PredictionResult,
    get_inference_service,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def inference_service():
    """Shared InferenceService instance loaded once for session test efficiency."""
    settings = get_settings()
    service = InferenceService(settings=settings, device="cpu")
    return service


def test_inference_service_init(inference_service):
    """Verify service loads configs, models, and sets evaluation flags properly."""
    assert inference_service.threshold == 0.55
    assert inference_service.T == 199
    assert inference_service.downsample_factor == 4
    assert inference_service.N == 50
    assert inference_service.model_version == "colab-t4-run-20260922"

    # Verify WavLM model
    assert inference_service.wavlm_model is not None
    assert not inference_service.wavlm_model.training
    for param in inference_service.wavlm_model.parameters():
        assert not param.requires_grad

    # Verify classifier model
    assert inference_service.model is not None
    assert not inference_service.model.training


def test_predict_pd_fixture(inference_service):
    """Test full inference pipeline with sample PD speech recording."""
    sample_path = FIXTURES_DIR / "sample_pd.wav"
    assert sample_path.exists(), f"Missing fixture: {sample_path}"

    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    result = inference_service.predict(audio_bytes=audio_bytes, filename="sample_pd.wav")

    # Assert PredictionResult contract
    assert isinstance(result, PredictionResult)
    assert result.prediction in ["parkinsons_risk_indicated", "low_risk_indicated"]
    assert 0.0 <= result.probability <= 1.0
    assert result.threshold_used == 0.55
    assert result.risk_tier in ["minimal", "low", "moderate", "high"]
    assert result.audio_duration_sec > 0.0
    assert result.model_version == "colab-t4-run-20260922"

    # Assert attention heatmap contract
    attn = result.attention
    assert "timestamps_sec" in attn
    assert "attention" in attn
    assert "peak_timestamp_sec" in attn
    assert "downsample_factor" in attn
    assert "num_frames" in attn

    assert len(attn["timestamps_sec"]) == 199
    assert len(attn["attention"]) == 199
    assert attn["num_frames"] == 199
    assert attn["downsample_factor"] == 4
    assert 0.0 <= min(attn["attention"])
    assert max(attn["attention"]) <= 1.0


def test_predict_healthy_fixture(inference_service):
    """Test full inference pipeline with sample healthy speech recording."""
    sample_path = FIXTURES_DIR / "sample_healthy.wav"
    assert sample_path.exists(), f"Missing fixture: {sample_path}"

    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    result = inference_service.predict(audio_bytes=audio_bytes, filename="sample_healthy.wav")

    assert isinstance(result, PredictionResult)
    assert result.prediction in ["parkinsons_risk_indicated", "low_risk_indicated"]
    assert 0.0 <= result.probability <= 1.0
    assert result.threshold_used == 0.55
    assert result.risk_tier in ["minimal", "low", "moderate", "high"]
    assert len(result.attention["timestamps_sec"]) == 199


def test_temp_file_cleanup(inference_service):
    """Verify no temporary audio files linger on disk after inference."""
    sample_path = FIXTURES_DIR / "sample_healthy.wav"
    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    temp_dir = Path(tempfile.gettempdir())
    files_before = set(temp_dir.iterdir())

    inference_service.predict(audio_bytes=audio_bytes, filename="cleanup_test_clip.wav")

    files_after = set(temp_dir.iterdir())
    new_files = files_after - files_before
    # None of the newly created files should match the test clip name
    leftovers = [f for f in new_files if "cleanup_test_clip" in f.name]
    assert len(leftovers) == 0, f"Leaked temporary audio files found: {leftovers}"


def test_validation_error_invalid_extension(inference_service):
    """Verify unsupported file extensions are rejected with HTTP 400."""
    with pytest.raises(HTTPException) as exc_info:
        inference_service.predict(b"dummy data", "recording.txt")
    assert exc_info.value.status_code == 400
    assert "Unsupported audio format" in exc_info.value.detail


def test_validation_error_empty_bytes(inference_service):
    """Verify 0-byte audio input is rejected with HTTP 400."""
    with pytest.raises(HTTPException) as exc_info:
        inference_service.predict(b"", "empty.wav")
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()


def test_validation_error_corrupted_data(inference_service):
    """Verify non-audio corrupted byte sequence is rejected with HTTP 400."""
    with pytest.raises(HTTPException) as exc_info:
        inference_service.predict(b"RIFF\x00\x00\x00\x00WAVEfmt corrupted bytes", "corrupted.wav")
    assert exc_info.value.status_code == 400
    assert "Failed to decode" in exc_info.value.detail


def test_validation_error_pure_silence(inference_service):
    """Verify pure silence recording is rejected with HTTP 400."""
    # Synthesize 1.0 second of pure zeros at 16kHz
    sr = 16000
    silent_data = np.zeros(sr, dtype=np.float32)
    tmp_silent = FIXTURES_DIR / "temp_silence.wav"
    sf.write(str(tmp_silent), silent_data, sr)

    try:
        with open(tmp_silent, "rb") as f:
            silent_bytes = f.read()

        with pytest.raises(HTTPException) as exc_info:
            inference_service.predict(silent_bytes, "silence.wav")
        assert exc_info.value.status_code == 400
        assert "silence" in exc_info.value.detail.lower()
    finally:
        if tmp_silent.exists():
            tmp_silent.unlink()


def test_dependency_provider():
    """Verify get_inference_service retrieves service from request app state."""
    class DummyApp:
        class State:
            inference_service = "mock_service"
        state = State()

    class DummyRequest:
        app = DummyApp()

    res = get_inference_service(DummyRequest())
    assert res == "mock_service"

    # Verify exception when missing
    DummyRequest.app.state.inference_service = None
    with pytest.raises(RuntimeError) as exc_info:
        get_inference_service(DummyRequest())
    assert "InferenceService is not initialized" in str(exc_info.value)
