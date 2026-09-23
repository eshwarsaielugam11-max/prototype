"""Unit tests for backend configuration management and environment parsing."""

import json
import os
from unittest.mock import patch
from backend.app.config import Settings, get_settings


def test_settings_default_values():
    """Verify default configuration values adhere to system architecture requirements."""
    settings = Settings()
    assert settings.backend_port == 8000
    assert settings.backend_host == "0.0.0.0"
    assert settings.max_upload_mb == 25
    assert settings.log_level.upper() == "INFO"
    assert "wav" in settings.allowed_formats_list
    assert "flac" in settings.allowed_formats_list
    assert "http://localhost:5173" in settings.cors_origins


def test_settings_custom_environment_override():
    """Verify settings can be overridden cleanly via environment variables."""
    env_overrides = {
        "BACKEND_PORT": "9000",
        "LOG_LEVEL": "DEBUG",
        "MAX_UPLOAD_MB": "50",
        "ALLOWED_AUDIO_FORMATS": "wav,mp3",
        "CORS_ORIGINS": json.dumps(["http://localhost:3000", "http://example.com"]),
    }

    with patch.dict(os.environ, env_overrides, clear=False):
        settings = Settings()
        assert settings.backend_port == 9000
        assert settings.log_level == "DEBUG"
        assert settings.max_upload_mb == 50
        assert settings.allowed_formats_list == ["wav", "mp3"]
        assert "http://localhost:3000" in settings.cors_origins
        assert "http://example.com" in settings.cors_origins


def test_get_settings_lru_cached():
    """Verify get_settings returns cached singleton."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
