"""Unit tests for audio validation service and rejection paths."""

import io
from pathlib import Path
from fastapi import HTTPException
import numpy as np
import pytest
import soundfile as sf

from backend.app.config import Settings
from backend.app.services.audio_validation import validate_audio_file

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def custom_settings():
    """Settings instance with explicit constraints for testing."""
    return Settings(
        max_upload_mb=5,
        allowed_audio_formats="wav,mp3,flac,ogg",
        model_artifact_dir=str(FIXTURES_DIR),
        sqlite_db_path=":memory:",
    )


@pytest.fixture
def sample_wav_bytes() -> bytes:
    """Load valid WAV audio fixture."""
    wav_path = FIXTURES_DIR / "sample_pd.wav"
    assert wav_path.exists(), f"Fixture missing: {wav_path}"
    with open(wav_path, "rb") as f:
        return f.read()


def test_valid_audio_file_accepted(sample_wav_bytes, custom_settings):
    """Verify valid WAV audio passes validation and returns correct tuple."""
    waveform, sr, duration = validate_audio_file(
        audio_bytes=sample_wav_bytes,
        filename="sample_pd.wav",
        settings=custom_settings,
        min_duration_sec=0.5,
    )

    assert isinstance(waveform, np.ndarray)
    assert waveform.ndim == 1  # Mono
    assert sr > 0
    assert duration >= 0.5


def test_missing_or_invalid_filename_rejected(sample_wav_bytes, custom_settings):
    """Verify empty filename or filename without extension raises 400."""
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(sample_wav_bytes, filename="", settings=custom_settings)
    assert exc_info.value.status_code == 400
    assert "Missing or invalid filename" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info2:
        validate_audio_file(sample_wav_bytes, filename="no_extension", settings=custom_settings)
    assert exc_info2.value.status_code == 400
    assert "Missing or invalid filename" in exc_info2.value.detail


def test_unsupported_audio_extension_rejected(sample_wav_bytes, custom_settings):
    """Verify disallowed extension raises 400 with permitted list."""
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(sample_wav_bytes, filename="recording.exe", settings=custom_settings)
    assert exc_info.value.status_code == 400
    assert "Unsupported audio format '.exe'" in exc_info.value.detail


def test_empty_audio_bytes_rejected(custom_settings):
    """Verify 0-byte file raises 400."""
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(b"", filename="recording.wav", settings=custom_settings)
    assert exc_info.value.status_code == 400
    assert "Uploaded audio file is empty" in exc_info.value.detail


def test_oversized_audio_bytes_rejected(custom_settings):
    """Verify file exceeding max_upload_mb raises 400."""
    # Settings has max_upload_mb = 5
    oversized = b"0" * (6 * 1024 * 1024)  # 6 MB
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(oversized, filename="recording.wav", settings=custom_settings)
    assert exc_info.value.status_code == 400
    assert "exceeds maximum allowed limit" in exc_info.value.detail


def test_corrupt_audio_stream_rejected(custom_settings):
    """Verify un-decodable binary stream raises 400."""
    corrupt_bytes = b"RIFF\x00\x00\x00\x00WAVEfmt \x00\x00\x00\x00NOT_AUDIO"
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(corrupt_bytes, filename="recording.wav", settings=custom_settings)
    assert exc_info.value.status_code == 400
    assert "Failed to decode audio file" in exc_info.value.detail


def test_short_duration_audio_rejected(custom_settings):
    """Verify audio under min_duration_sec raises 400."""
    sr = 16000
    short_signal = np.sin(2 * np.pi * 440 * np.linspace(0, 0.1, int(sr * 0.1))).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, short_signal, sr, format="WAV")
    short_bytes = buf.getvalue()

    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(
            short_bytes,
            filename="short.wav",
            settings=custom_settings,
            min_duration_sec=0.5,
        )
    assert exc_info.value.status_code == 400
    assert "is too short" in exc_info.value.detail


def test_silent_audio_energy_rejected(custom_settings):
    """Verify completely silent audio (below RMS energy threshold) raises 400."""
    sr = 16000
    silent_signal = np.zeros(sr, dtype=np.float32)
    buf = io.BytesIO()
    sf.write(buf, silent_signal, sr, format="WAV")
    silent_bytes = buf.getvalue()

    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file(
            silent_bytes,
            filename="silent.wav",
            settings=custom_settings,
            min_duration_sec=0.5,
        )
    assert exc_info.value.status_code == 400
    assert "contains near-total silence" in exc_info.value.detail
