"""Unit and integration tests for provider-abstracted LLMService.

TECHNICAL NOTE:
In accordance with task constraints, ALL tests mock underlying HTTP clients.
NO real network requests are executed in the automated test suite to prevent
burning free-tier API quotas.
"""

from unittest.mock import MagicMock, patch
import pytest

from backend.app.config import Settings
from backend.app.services.llm import (
    GeminiLLMProvider,
    LLMAuthenticationError,
    LLMConnectionError,
    LLMError,
    LLMRateLimitError,
    LLMService,
    OllamaLLMProvider,
    OpenAICompatibleProvider,
    get_llm_service,
)


# ------------------------------------------------------------------------------
# Provider Selection and Initialization Tests
# ------------------------------------------------------------------------------

def test_provider_selection_groq():
    """Verify Groq provider maps to OpenAICompatibleProvider with Groq endpoint."""
    settings = Settings(
        llm_provider="groq",
        llm_api_key="test-groq-key",
        llm_model="llama-3.3-70b-versatile",
        llm_base_url="https://api.groq.com/openai/v1",
    )
    service = LLMService(settings=settings)
    assert isinstance(service.provider, OpenAICompatibleProvider)
    assert service.provider.base_url == "https://api.groq.com/openai/v1"
    assert service.provider.model == "llama-3.3-70b-versatile"


def test_provider_selection_openrouter():
    """Verify OpenRouter provider maps to OpenAICompatibleProvider with OpenRouter endpoint."""
    settings = Settings(
        llm_provider="openrouter",
        llm_api_key="test-or-key",
        llm_model="meta-llama/llama-3.3-70b-instruct",
        llm_base_url="https://openrouter.ai/api/v1",
    )
    service = LLMService(settings=settings)
    assert isinstance(service.provider, OpenAICompatibleProvider)
    assert service.provider.base_url == "https://openrouter.ai/api/v1"


def test_provider_selection_gemini():
    """Verify Gemini provider maps to GeminiLLMProvider."""
    settings = Settings(
        llm_provider="gemini",
        llm_api_key="test-gemini-key",
        llm_model="gemini-2.5-flash",
    )
    service = LLMService(settings=settings)
    assert isinstance(service.provider, GeminiLLMProvider)
    assert service.provider.model_name == "gemini-2.5-flash"


def test_provider_selection_invalid_raises_value_error():
    """Verify unsupported provider name raises ValueError."""
    settings = Settings(llm_provider="unsupported_provider", llm_api_key="dummy")
    with pytest.raises(ValueError) as exc_info:
        LLMService(settings=settings)
    assert "Unsupported LLM provider" in str(exc_info.value)


# ------------------------------------------------------------------------------
# Non-Fatal Availability Check Tests (Zero Quota Usage on Boot)
# ------------------------------------------------------------------------------

def test_check_availability_with_valid_key():
    """Verify check_availability reports ready when non-empty key is present."""
    settings = Settings(llm_provider="groq", llm_api_key="gsk_valid_free_tier_key")
    service = LLMService(settings=settings)
    available, msg = service.check_availability()

    assert available is True
    assert "groq" in msg.lower()
    assert "configured" in msg.lower()


def test_check_availability_with_missing_key():
    """Verify check_availability reports False with guidance when key is None or empty."""
    settings = Settings(llm_provider="groq", llm_api_key=None)
    service = LLMService(settings=settings)
    available, msg = service.check_availability()

    assert available is False
    assert "LLM_API_KEY is not set" in msg
    assert "docs/LLM_SETUP.md" in msg


def test_check_availability_with_placeholder_key():
    """Verify check_availability reports False when placeholder text is detected."""
    settings = Settings(llm_provider="groq", llm_api_key="your-groq-api-key-here")
    service = LLMService(settings=settings)
    available, msg = service.check_availability()

    assert available is False
    assert "LLM_API_KEY is not set" in msg


# ------------------------------------------------------------------------------
# Mocked Generation & Error Mapping Tests (OpenAI / Groq)
# ------------------------------------------------------------------------------

def test_openai_compatible_generate_success():
    """Verify successful chat completion payload construction and response parsing."""
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Clinical Decision Support Summary: Elevated vocal tremor observed."
    mock_response = MagicMock(choices=[mock_choice])
    mock_client.chat.completions.create.return_value = mock_response

    provider = OpenAICompatibleProvider(
        api_key="mock_secret_key_12345",
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
        client=mock_client,
    )
    service = LLMService(
        settings=Settings(llm_provider="groq", llm_api_key="mock_secret_key_12345"),
        provider=provider,
    )

    result = service.generate(
        system_prompt="You are a clinical decision support assistant.",
        user_prompt="Analyze acoustic test scores.",
        temperature=0.2,
        max_tokens=512,
    )

    assert result == "Clinical Decision Support Summary: Elevated vocal tremor observed."
    mock_client.chat.completions.create.assert_called_once_with(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a clinical decision support assistant."},
            {"role": "user", "content": "Analyze acoustic test scores."},
        ],
        temperature=0.2,
        max_tokens=512,
    )


def test_openai_compatible_auth_error():
    """Verify HTTP 401/403 AuthenticationError raises LLMAuthenticationError."""
    import openai

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = openai.AuthenticationError(
        message="Invalid API Key provided",
        response=MagicMock(status_code=401),
        body={},
    )

    provider = OpenAICompatibleProvider(
        api_key="mock_bad_key",
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
        client=mock_client,
    )
    service = LLMService(
        settings=Settings(llm_provider="groq", llm_api_key="mock_bad_key"),
        provider=provider,
    )

    with pytest.raises(LLMAuthenticationError) as exc_info:
        service.generate(system_prompt="System", user_prompt="User")

    assert "Invalid or missing API key" in str(exc_info.value)
    assert "mock_bad_key" not in str(exc_info.value)  # Ensure key is never leaked


def test_openai_compatible_rate_limit_error_429():
    """Verify HTTP 429 RateLimitError raises LLMRateLimitError."""
    import openai

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = openai.RateLimitError(
        message="Rate limit reached for organization",
        response=MagicMock(status_code=429),
        body={},
    )

    provider = OpenAICompatibleProvider(
        api_key="mock_key",
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
        client=mock_client,
    )
    service = LLMService(
        settings=Settings(llm_provider="groq", llm_api_key="mock_key"),
        provider=provider,
    )

    with pytest.raises(LLMRateLimitError) as exc_info:
        service.generate(system_prompt="System", user_prompt="User")

    assert "Free-tier rate limit reached" in str(exc_info.value)
    assert "HTTP 429" in str(exc_info.value)


def test_openai_compatible_timeout_error():
    """Verify APITimeoutError raises LLMConnectionError with timeout details."""
    import openai

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = openai.APITimeoutError(
        request=MagicMock()
    )

    provider = OpenAICompatibleProvider(
        api_key="mock_key",
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
        client=mock_client,
    )
    service = LLMService(
        settings=Settings(llm_provider="groq", llm_api_key="mock_key"),
        provider=provider,
    )

    with pytest.raises(LLMConnectionError) as exc_info:
        service.generate(system_prompt="System", user_prompt="User")

    assert "unreachable or timed out" in str(exc_info.value)


def test_generate_refuses_when_key_is_missing():
    """Verify generate immediately raises LLMAuthenticationError if key is missing/placeholder."""
    settings = Settings(llm_provider="groq", llm_api_key="")
    mock_provider = MagicMock()
    service = LLMService(settings=settings, provider=mock_provider)

    with pytest.raises(LLMAuthenticationError) as exc_info:
        service.generate(system_prompt="System", user_prompt="User")

    assert "LLM_API_KEY is missing or contains placeholder" in str(exc_info.value)
    mock_provider.generate.assert_not_called()


# ------------------------------------------------------------------------------
# Mocked Generation Tests (Gemini)
# ------------------------------------------------------------------------------

def test_gemini_provider_generate_success():
    """Verify Gemini provider successfully formats and extracts completion."""
    mock_gemini_client = MagicMock()
    mock_gemini_client.generate_content.return_value = MagicMock(
        text="Grounded report: Mild pitch variability detected."
    )

    provider = GeminiLLMProvider(
        api_key="mock_gemini_key",
        model="gemini-2.5-flash",
        client=mock_gemini_client,
    )
    service = LLMService(
        settings=Settings(llm_provider="gemini", llm_api_key="mock_gemini_key"),
        provider=provider,
    )

    result = service.generate(
        system_prompt="System instructions",
        user_prompt="Patient data",
        temperature=0.2,
    )

    assert result == "Grounded report: Mild pitch variability detected."
    mock_gemini_client.generate_content.assert_called_once_with(
        system_prompt="System instructions",
        user_prompt="Patient data",
        temperature=0.2,
        max_tokens=1024,
    )


# ------------------------------------------------------------------------------
# Dependency Provider Tests
# ------------------------------------------------------------------------------

def test_get_llm_service_dependency():
    """Verify get_llm_service retrieves instance from request.app.state."""
    class DummyApp:
        class State:
            llm_service = "mock_service_instance"
        state = State()

    class DummyRequest:
        app = DummyApp()

    res = get_llm_service(DummyRequest())
    assert res == "mock_service_instance"

    # Verify exception when missing on app state
    DummyRequest.app.state.llm_service = None
    with pytest.raises(RuntimeError) as exc_info:
        get_llm_service(DummyRequest())
    assert "LLMService is not initialized" in str(exc_info.value)
