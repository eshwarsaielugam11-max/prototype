"""Application configuration management via Pydantic Settings.

Reads from environment variables and local .env file, providing sensible defaults
for all required database, vector store, ML artifact, and server network settings.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration class for Parkinson's Voice Platform backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Hosted LLM Settings (Primary: Groq, Fallback: Gemini / OpenRouter)
    llm_provider: str = Field(
        default="groq",
        description="Active LLM provider: 'groq' | 'gemini' | 'openrouter' | 'ollama'",
    )
    llm_api_key: Optional[str] = Field(
        default=None,
        description="API key for hosted LLM provider (Groq/Gemini/OpenRouter)",
    )
    llm_model: str = Field(
        default="llama-3.3-70b-versatile",
        description="Model name on target provider (e.g., 'llama-3.3-70b-versatile', 'gemini-2.5-flash')",
    )
    llm_base_url: str = Field(
        default="https://api.groq.com/openai/v1",
        description="Base URL for OpenAI-compatible LLM endpoint (Groq / OpenRouter)",
    )

    # Legacy/Local Ollama Settings (Optional Local Fallback)
    ollama_host: str = Field(
        default="http://localhost:11434",
        description="Base URL for local Ollama service",
    )
    ollama_model: str = Field(
        default="qwen2.5:3b-instruct",
        description="Target model identifier hosted in Ollama",
    )

    # Vector DB & Embeddings (ChromaDB + BGE)
    chroma_persist_dir: str = Field(
        default="./rag/knowledge_base/chroma_db",
        description="Local filesystem directory for persistent ChromaDB storage",
    )

    # Relational Database (SQLite History)
    sqlite_db_path: str = Field(
        default="./backend/app.db",
        description="File path to the SQLite application database",
    )

    # Machine Learning Model Artifacts
    model_artifact_dir: str = Field(
        default="./models/artifact",
        description="Directory containing model.pt, config.json, and eval_metrics.json",
    )

    # Audio Ingestion Constraints
    max_upload_mb: int = Field(
        default=25,
        description="Maximum permitted audio upload size in megabytes",
    )
    allowed_audio_formats: str = Field(
        default="wav,mp3,flac,m4a,ogg,webm,mp4,aac",
        description="Comma-separated list of allowed audio file extensions",
    )

    # Server Network Settings
    backend_host: str = Field(
        default="0.0.0.0",
        description="Host interface for FastAPI/Uvicorn server",
    )
    backend_port: int = Field(
        default=8000,
        description="Listening TCP port for the FastAPI server",
    )
    frontend_port: int = Field(
        default=5173,
        description="Frontend dev server port for CORS whitelist",
    )
    environment: str = Field(
        default="development",
        description="Execution environment (development, staging, production)",
    )
    log_level: str = Field(
        default="INFO",
        description="Application logging level (DEBUG, INFO, WARNING, ERROR)",
    )

    # CORS Whitelist
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ],
        description="List of allowed HTTP origins for Cross-Origin Resource Sharing",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated string of origins if passed from environment."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def allowed_formats_list(self) -> List[str]:
        """Return allowed audio extensions as a cleaned list."""
        return [fmt.strip().lower().lstrip(".") for fmt in self.allowed_audio_formats.split(",") if fmt.strip()]

    @property
    def resolved_model_artifact_dir(self) -> Path:
        """Return resolved Path to model artifact directory."""
        return Path(self.model_artifact_dir).resolve()

    @property
    def resolved_db_path(self) -> Path:
        """Return resolved Path to SQLite database file."""
        return Path(self.sqlite_db_path).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Dependency provider returning singleton Settings instance."""
    return Settings()
