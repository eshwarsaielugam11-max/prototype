"""Unit and integration tests for LLMService and local Ollama wrapper."""

from unittest.mock import MagicMock
import pytest

from backend.app.config import get_settings
from backend.app.services.llm import LLMService, get_llm_service


def is_live_model_ready() -> bool:
    """Helper determining if a live local Ollama instance has the configured model ready."""
    try:
        service = LLMService()
        ready, _ = service.check_availability()
        return ready
    except Exception:
        return False


def test_llm_service_init():
    """Verify default initialization loads host and model from application settings."""
    settings = get_settings()
    service = LLMService(settings=settings)

    assert service.host == settings.ollama_host
    assert service.model_name == settings.ollama_model
    assert service.client is not None


def test_check_availability_model_present():
    """Verify check_availability returns True when target model is reported by Ollama."""
    mock_client = MagicMock()
    # Simulate ollama.Client.list() returning matching model
    mock_model = MagicMock()
    mock_model.model = "qwen2.5:3b-instruct"
    mock_client.list.return_value = MagicMock(models=[mock_model])

    service = LLMService(client=mock_client)
    is_available, message = service.check_availability()

    assert is_available is True
    assert "ready" in message
    assert service.model_name in message


def test_check_availability_model_missing():
    """Verify check_availability returns False with pull instructions when model is not installed."""
    mock_client = MagicMock()
    mock_model = MagicMock()
    mock_model.model = "llama3.2:1b"
    mock_client.list.return_value = MagicMock(models=[mock_model])

    service = LLMService(client=mock_client)
    is_available, message = service.check_availability()

    assert is_available is False
    assert "not pulled" in message
    assert f"ollama pull {service.model_name}" in message


def test_check_availability_connection_error():
    """Verify check_availability handles connection failure gracefully with serve instructions."""
    mock_client = MagicMock()
    mock_client.list.side_effect = ConnectionRefusedError("Failed to connect to Ollama")

    service = LLMService(client=mock_client)
    is_available, message = service.check_availability()

    assert is_available is False
    assert "Cannot connect to local Ollama service" in message
    assert "ollama serve" in message


def test_generate_mock_success():
    """Verify generate correctly constructs chat payloads and extracts message content."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.message.content = "  The patient exhibits moderate vocal hypophonia.  "
    mock_client.chat.return_value = mock_response

    service = LLMService(client=mock_client)
    result = service.generate(
        system_prompt="You are a clinical decision support system.",
        user_prompt="Summarize acoustic findings.",
        temperature=0.25,
        max_tokens=512,
    )

    assert result == "The patient exhibits moderate vocal hypophonia."
    mock_client.chat.assert_called_once()
    call_kwargs = mock_client.chat.call_args[1]
    assert call_kwargs["model"] == service.model_name
    assert call_kwargs["messages"] == [
        {"role": "system", "content": "You are a clinical decision support system."},
        {"role": "user", "content": "Summarize acoustic findings."},
    ]
    assert call_kwargs["options"]["temperature"] == 0.25
    assert call_kwargs["options"]["num_predict"] == 512


def test_generate_mock_error_raises_runtime_error():
    """Verify generation failure raises informative RuntimeError."""
    mock_client = MagicMock()
    mock_client.chat.side_effect = TimeoutError("Ollama request timed out after 60s")

    service = LLMService(client=mock_client)
    with pytest.raises(RuntimeError) as exc_info:
        service.generate(
            system_prompt="System",
            user_prompt="User",
        )
    assert "Failed to generate completion from Ollama" in str(exc_info.value)
    assert "Verify that `ollama serve` is running" in str(exc_info.value)


def test_get_llm_service_dependency():
    """Verify get_llm_service retrieves instance from request.app.state."""
    class DummyApp:
        class State:
            llm_service = "mock_llm_instance"
        state = State()

    class DummyRequest:
        app = DummyApp()

    res = get_llm_service(DummyRequest())
    assert res == "mock_llm_instance"

    # Verify exception when missing on app state
    DummyRequest.app.state.llm_service = None
    with pytest.raises(RuntimeError) as exc_info:
        get_llm_service(DummyRequest())
    assert "LLMService is not initialized" in str(exc_info.value)


@pytest.mark.skipif(
    not is_live_model_ready(),
    reason="Local Ollama daemon not reachable or target model not pulled yet. "
           "Mock unit tests ensure 100% test coverage and validation when Ollama is offline.",
)
def test_live_ollama_generation():
    """Live integration test: calls local Ollama if running with target model pulled."""
    service = LLMService()
    system_prompt = "You are a medical speech assistant. Respond in one concise sentence."
    user_prompt = "Define hypophonia in Parkinson's disease."

    response = service.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=100,
    )

    assert isinstance(response, str)
    assert len(response.strip()) > 0
    assert "hypophonia" in response.lower() or "voice" in response.lower() or "soft" in response.lower()
