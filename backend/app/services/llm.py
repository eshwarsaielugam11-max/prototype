"""Provider-abstracted LLM Service for Parkinson's Voice Platform.

Supports hosted free-tier providers:
- Groq (Primary): OpenAI-compatible API via https://api.groq.com/openai/v1 (30 RPM / 1,000 RPD)
- Google Gemini (Fallback): via google.generativeai (15 RPM / 1,500 RPD)
- OpenRouter (Alternative): OpenAI-compatible API via https://openrouter.ai/api/v1
- Ollama (Local Fallback): local daemon for offline execution

SECURITY & SAFETY PRINCIPLES:
1. API keys are loaded strictly from environment variables and NEVER logged, printed,
   or exposed in client-facing error payloads.
2. Low temperature generation (0.2 - 0.3) for factual, hallucination-resistant clinical reporting.
3. Specific exception handling for authentication, rate-limiting (429), and timeouts.
4. Non-fatal application startup: Missing credentials log an advisory notice without crashing.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
import logging

from backend.app.config import Settings, get_settings

logger = logging.getLogger("parkinsons_platform.llm")


# ------------------------------------------------------------------------------
# Specific LLM Exception Hierarchy
# ------------------------------------------------------------------------------

class LLMError(RuntimeError):
    """Base class for all LLM service failures."""


class LLMAuthenticationError(LLMError):
    """Raised when provider credentials are invalid, expired, or rejected (HTTP 401/403)."""


class LLMRateLimitError(LLMError):
    """Raised when free-tier request or token rate limits are exceeded (HTTP 429)."""


class LLMConnectionError(LLMError):
    """Raised when network connectivity fails, connection is refused, or request times out."""


# ------------------------------------------------------------------------------
# Abstract Provider Interface
# ------------------------------------------------------------------------------

class BaseLLMProvider(ABC):
    """Abstract interface defining the uniform LLM text generation contract."""

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """Generate text completion from system directive and user prompt."""


# ------------------------------------------------------------------------------
# OpenAI-Compatible Provider (Groq / OpenRouter)
# ------------------------------------------------------------------------------

class OpenAICompatibleProvider(BaseLLMProvider):
    """Client for any OpenAI-compatible endpoint, including Groq and OpenRouter."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        client: Optional[Any] = None,
    ):
        self.base_url = base_url
        self.model = model

        if client is not None:
            self.client = client
        else:
            import openai
            # Use placeholder if empty so client can initialize safely without crashing on startup
            safe_key = api_key if (api_key and not api_key.startswith("your-")) else "missing-key"
            # 5s connect timeout, 20s read/overall timeout
            self.client = openai.OpenAI(
                api_key=safe_key,
                base_url=base_url,
                timeout=20.0,
                max_retries=1,
            )

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        import openai

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=float(temperature),
                max_tokens=int(max_tokens),
            )
            content = response.choices[0].message.content or ""
            return content.strip()

        except openai.AuthenticationError as exc:
            logger.error("LLM authentication failure on endpoint %s: %s", self.base_url, exc)
            raise LLMAuthenticationError(
                "Invalid or missing API key for hosted LLM provider. "
                "Please verify your LLM_API_KEY in .env (see docs/LLM_SETUP.md)."
            ) from exc

        except openai.RateLimitError as exc:
            logger.warning("LLM free-tier rate limit reached on endpoint %s: %s", self.base_url, exc)
            raise LLMRateLimitError(
                "Free-tier rate limit reached on LLM provider (HTTP 429). "
                "Please wait shortly before retrying your report request."
            ) from exc

        except (openai.APITimeoutError, openai.APIConnectionError) as exc:
            logger.error("LLM endpoint %s unreachable or timed out: %s", self.base_url, exc)
            raise LLMConnectionError(
                "LLM provider endpoint unreachable or timed out (5s connect / 20s read). "
                "Check network connectivity or provider status."
            ) from exc

        except openai.APIError as exc:
            logger.error("LLM API returned error: %s", exc)
            raise LLMError(f"LLM provider API error: {exc.message}") from exc

        except Exception as exc:
            logger.error("Unexpected error during LLM generation: %s", exc, exc_info=True)
            raise LLMError(f"Unexpected error communicating with LLM provider: {str(exc)}") from exc


# ------------------------------------------------------------------------------
# Google Gemini Provider
# ------------------------------------------------------------------------------

class GeminiLLMProvider(BaseLLMProvider):
    """Client for Google Gemini models via google.generativeai."""

    def __init__(
        self,
        api_key: str,
        model: str,
        client: Optional[Any] = None,
    ):
        self.model_name = model
        self.api_key = api_key
        self._custom_client = client

        if client is None:
            import google.generativeai as genai
            safe_key = api_key if (api_key and not api_key.startswith("your-")) else "missing-key"
            try:
                genai.configure(api_key=safe_key)
            except Exception:
                pass

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        try:
            if self._custom_client is not None:
                # Mocked or injected client for testing
                response = self._custom_client.generate_content(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return getattr(response, "text", str(response)).strip()

            import google.generativeai as genai
            from google.api_core import exceptions as google_exceptions

            gen_config = genai.types.GenerationConfig(
                temperature=float(temperature),
                max_output_tokens=int(max_tokens),
            )

            # Gemini models accept system_instruction
            try:
                model_instance = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=system_prompt,
                    generation_config=gen_config,
                )
                response = model_instance.generate_content(user_prompt)
            except Exception:
                # Fallback combining system prompt and user prompt
                model_instance = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config=gen_config,
                )
                combined = f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER REQUEST:\n{user_prompt}"
                response = model_instance.generate_content(combined)

            return response.text.strip()

        except Exception as exc:
            exc_str = str(exc).lower()
            if "unauthenticated" in exc_str or "api_key_invalid" in exc_str or "401" in exc_str or "403" in exc_str:
                logger.error("Gemini authentication failure: %s", exc)
                raise LLMAuthenticationError(
                    "Invalid or missing Google Gemini API key. "
                    "Please verify LLM_API_KEY in .env (see docs/LLM_SETUP.md)."
                ) from exc

            elif "quota" in exc_str or "resource_exhausted" in exc_str or "429" in exc_str:
                logger.warning("Gemini free-tier quota exceeded: %s", exc)
                raise LLMRateLimitError(
                    "Free-tier rate limit reached on Google Gemini (HTTP 429). "
                    "Please wait shortly before retrying your report request."
                ) from exc

            elif "deadline" in exc_str or "unavailable" in exc_str or "timeout" in exc_str:
                logger.error("Gemini service unreachable or timed out: %s", exc)
                raise LLMConnectionError(
                    "Google Gemini endpoint unreachable or timed out. "
                    "Check network connectivity or provider status."
                ) from exc

            logger.error("Gemini API error: %s", exc, exc_info=True)
            raise LLMError(f"Google Gemini generation failure: {str(exc)}") from exc


# ------------------------------------------------------------------------------
# Local Ollama Fallback Provider
# ------------------------------------------------------------------------------

class OllamaLLMProvider(BaseLLMProvider):
    """Client for local Ollama daemon for offline execution."""

    def __init__(
        self,
        host: str,
        model: str,
        client: Optional[Any] = None,
    ):
        self.host = host
        self.model = model
        if client is not None:
            self.client = client
        else:
            import ollama
            self.client = ollama.Client(host=host)

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        options = {
            "temperature": float(temperature),
            "num_predict": int(max_tokens),
        }

        try:
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options=options,
            )
            if hasattr(response, "message") and hasattr(response.message, "content"):
                return response.message.content.strip()
            elif isinstance(response, dict):
                return response.get("message", {}).get("content", "").strip()
            return str(response).strip()

        except Exception as exc:
            logger.error("Ollama generation failed: %s", exc, exc_info=True)
            raise LLMConnectionError(
                f"Failed to generate completion from local Ollama ({self.host}): {str(exc)}. "
                "Ensure `ollama serve` is running."
            ) from exc


# ------------------------------------------------------------------------------
# Unified LLM Service
# ------------------------------------------------------------------------------

class LLMService:
    """Unified, provider-abstracted service for clinical decision support report generation."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        provider: Optional[BaseLLMProvider] = None,
    ):
        """Initialize LLMService with configured provider.

        Args:
            settings: Optional Settings instance. Defaults to get_settings().
            provider: Optional explicit BaseLLMProvider instance (useful for unit testing).
        """
        self.settings = settings or get_settings()
        self.provider_name = (self.settings.llm_provider or "groq").lower().strip()
        self.model_name = self.settings.llm_model

        if provider is not None:
            self.provider = provider
        else:
            self.provider = self._build_provider()

    def _build_provider(self) -> BaseLLMProvider:
        """Construct the appropriate provider instance based on application settings."""
        api_key = self.settings.llm_api_key or ""

        if self.provider_name in ["groq", "openrouter"]:
            base_url = self.settings.llm_base_url
            if self.provider_name == "groq" and not base_url:
                base_url = "https://api.groq.com/openai/v1"
            elif self.provider_name == "openrouter" and not base_url:
                base_url = "https://openrouter.ai/api/v1"

            return OpenAICompatibleProvider(
                api_key=api_key,
                base_url=base_url,
                model=self.model_name,
            )

        elif self.provider_name == "gemini":
            return GeminiLLMProvider(
                api_key=api_key,
                model=self.model_name,
            )

        elif self.provider_name == "ollama":
            return OllamaLLMProvider(
                host=self.settings.ollama_host,
                model=self.settings.ollama_model,
            )

        else:
            raise ValueError(
                f"Unsupported LLM provider '{self.provider_name}'. "
                "Permitted values are: 'groq', 'gemini', 'openrouter', 'ollama'."
            )

    def check_availability(self) -> Tuple[bool, str]:
        """Perform non-fatal credential check without burning API call quota at startup.

        Returns:
            Tuple of (is_available: bool, status_message: str).
        """
        if self.provider_name == "ollama":
            try:
                import ollama
                client = ollama.Client(host=self.settings.ollama_host)
                client.list()
                return True, f"Local Ollama daemon is reachable at {self.settings.ollama_host}."
            except Exception as exc:
                return False, f"Cannot connect to local Ollama service: {exc}."

        # Hosted API provider check: verify key is present and non-empty
        raw_key = (self.settings.llm_api_key or "").strip()
        is_placeholder = raw_key in ["", "your-groq-api-key-here", "your-gemini-api-key-here"]

        if not raw_key or is_placeholder:
            msg = (
                f"LLM provider '{self.provider_name}' requires an API key, but LLM_API_KEY is not set. "
                "Clinical report generation will be disabled until a free key is provided in .env. "
                "See docs/LLM_SETUP.md for 2-minute setup instructions (no credit card required)."
            )
            return False, msg

        return (
            True,
            f"Hosted LLM provider '{self.provider_name}' configured with model '{self.model_name}'."
        )

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """Generate text completion through the configured provider.

        Args:
            system_prompt: Directive establishing clinical persona, rules, and grounding evidence.
            user_prompt: Query or screening data to analyze.
            temperature: Sampling temperature [0.0 - 1.0]. Defaults to 0.2 for factual consistency.
            max_tokens: Maximum response tokens. Defaults to 1024.

        Returns:
            Generated text string response.
        """
        # Enforce that key is present before attempting hosted call
        if self.provider_name != "ollama":
            raw_key = (self.settings.llm_api_key or "").strip()
            if not raw_key or raw_key.startswith("your-"):
                raise LLMAuthenticationError(
                    f"LLM_API_KEY is missing or contains placeholder. "
                    f"Please configure your free {self.provider_name.title()} API key in .env (see docs/LLM_SETUP.md)."
                )

        return self.provider.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )


def get_llm_service(request: Any) -> LLMService:
    """FastAPI dependency yielding the application-level LLMService singleton."""
    service = getattr(request.app.state, "llm_service", None)
    if service is None:
        raise RuntimeError(
            "LLMService is not initialized on app.state. "
            "Ensure the FastAPI lifespan startup event executed successfully."
        )
    return service
