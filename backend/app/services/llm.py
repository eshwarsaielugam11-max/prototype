"""Local LLM Service integration via Ollama for Parkinson's Voice Platform.

Thin, well-guarded wrapper around the local Ollama API (Qwen2.5-3B-Instruct / Phi-3.5-mini)
used for generating grounded, factual clinical decision support summaries.

TECHNICAL & SAFETY PRINCIPLES:
1. Purely local execution: No external network API dependencies or remote data transmission.
2. Low temperature generation (0.2 - 0.3) for factual clinical grounding, avoiding hallucination.
3. Non-fatal availability checking: Server boots smoothly even if Ollama is offline,
   setting app.state.llm_available = False with clear operator guidance.
"""

from typing import Any, Dict, List, Optional, Tuple
import logging

import ollama

from backend.app.config import Settings, get_settings

logger = logging.getLogger("parkinsons_platform.llm")


class LLMService:
    """Service wrapper for interacting with locally hosted Ollama large language models."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        client: Optional[ollama.Client] = None,
    ):
        """Initialize LLM service with application settings and Ollama client.

        Args:
            settings: Application settings singleton.
            client: Optional preconfigured ollama.Client instance (useful for unit testing).
        """
        self.settings = settings or get_settings()
        self.host = self.settings.ollama_host
        self.model_name = self.settings.ollama_model
        self.client = client or ollama.Client(host=self.host)

    def check_availability(self) -> Tuple[bool, str]:
        """Verify that the local Ollama server is reachable and the required model is pulled.

        Returns:
            Tuple of (is_available: bool, status_message: str).
        """
        try:
            response = self.client.list()
            # Handle both object attributes and dictionary returns from ollama client
            models_list = getattr(response, "models", None)
            if models_list is None and isinstance(response, dict):
                models_list = response.get("models", [])
            elif models_list is None and isinstance(response, list):
                models_list = response

            model_names: List[str] = []
            for m in (models_list or []):
                name = getattr(m, "model", None) or getattr(m, "name", None)
                if name is None and isinstance(m, dict):
                    name = m.get("model") or m.get("name")
                if name:
                    model_names.append(str(name).lower())

            # Check if target model or tag exists in pulled models
            target = self.model_name.lower()
            target_base = target.split(":")[0]

            matched = any(
                target == m or target in m or target_base == m.split(":")[0]
                for m in model_names
            )

            if matched:
                msg = f"Ollama is reachable at {self.host} and model '{self.model_name}' is ready."
                logger.info(msg)
                return True, msg
            else:
                available_str = ", ".join(model_names) if model_names else "none"
                msg = (
                    f"Ollama server is reachable at {self.host}, but model '{self.model_name}' is not pulled. "
                    f"Installed models: [{available_str}]. "
                    f"To install, run: `ollama pull {self.model_name}`"
                )
                logger.warning(msg)
                return False, msg

        except Exception as exc:
            msg = (
                f"Cannot connect to local Ollama service at {self.host}: {str(exc)}. "
                "Ensure Ollama is installed and running (`ollama serve`). "
                f"Refer to docs/OLLAMA_SETUP.md for installation instructions."
            )
            logger.warning(msg)
            return False, msg

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = 1024,
    ) -> str:
        """Generate text completion from local Ollama model using structured chat format.

        Args:
            system_prompt: System directive specifying persona, rules, and grounding evidence.
            user_prompt: User query or screening data to analyze.
            temperature: Sampling temperature [0.0 - 1.0]. Defaults to 0.2 for factual consistency.
            max_tokens: Maximum number of output tokens. Defaults to 1024.

        Returns:
            Generated text string response.

        Raises:
            RuntimeError: If Ollama is unreachable, model missing, or generation fails.
        """
        options: Dict[str, Any] = {
            "temperature": float(temperature),
        }
        if max_tokens is not None:
            options["num_predict"] = int(max_tokens)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        logger.debug(
            "Invoking Ollama chat completion (model=%s, temp=%.2f, max_tokens=%s)...",
            self.model_name,
            temperature,
            max_tokens,
        )

        try:
            response = self.client.chat(
                model=self.model_name,
                messages=messages,
                options=options,
            )

            # Extract message content across client versions
            if hasattr(response, "message") and hasattr(response.message, "content"):
                content = response.message.content
            elif isinstance(response, dict):
                content = response.get("message", {}).get("content", "")
            else:
                content = str(response)

            return content.strip()

        except Exception as exc:
            err_msg = (
                f"Failed to generate completion from Ollama model '{self.model_name}' at {self.host}: {str(exc)}. "
                "Verify that `ollama serve` is running and the model is pulled (`ollama pull "
                f"{self.model_name}`)."
            )
            logger.error(err_msg, exc_info=True)
            raise RuntimeError(err_msg) from exc


def get_llm_service(request: Any) -> LLMService:
    """FastAPI dependency yielding the application-level LLMService singleton."""
    service = getattr(request.app.state, "llm_service", None)
    if service is None:
        raise RuntimeError(
            "LLMService is not initialized on app.state. "
            "Ensure the FastAPI lifespan startup event executed successfully."
        )
    return service
