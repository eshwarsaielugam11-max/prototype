"""Acoustic ML Inference Service for Parkinson's Voice Platform.

Singleton inference engine that loads WavLM and the trained TorchScript
classifier at application startup, performs audio validation, feature extraction,
prediction inference, and generates time-aligned attention heatmaps.

MEDICAL SAFETY NOTICE:
Screening classification vocabulary is strictly restricted to:
- 'parkinsons_risk_indicated'
- 'low_risk_indicated'
Diagnostic terms ('positive', 'negative', 'diagnosed') are strictly forbidden.
Raw audio is never persisted to disk beyond the temporary lifetime of the request.
"""

from pathlib import Path
import json
import logging
import os
import tempfile
from typing import Any, Dict, Optional, Tuple

import numpy as np
from pydantic import BaseModel, Field
import torch
from transformers import WavLMModel

from backend.app.config import Settings, get_settings
from backend.app.services.audio_validation import validate_audio_file
from ml.explainability.attention_rollout import compute_time_aligned_attention
from ml.model_def.model import ModelConfig, ParkinsonsVoiceClassifier
from ml.preprocessing.audio_preprocessing import PreprocessConfig, preprocess_audio

logger = logging.getLogger("parkinsons_platform.inference")


class PredictionResult(BaseModel):
    """Structured clinical screening output returned by acoustic inference service."""

    prediction: str = Field(
        ...,
        description="Screening risk classification: 'parkinsons_risk_indicated' or 'low_risk_indicated'",
    )
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model output probability of elevated Parkinson's acoustic risk [0.0, 1.0]",
    )
    threshold_used: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Operational decision threshold applied for binary risk bifurcation",
    )
    attention: Dict[str, Any] = Field(
        ...,
        description="Time-aligned attention explainability heatmap dictionary",
    )
    audio_duration_sec: float = Field(
        ...,
        gt=0.0,
        description="Duration of the audio recording in seconds",
    )
    model_version: str = Field(
        ...,
        description="Training run identifier and model artifact version string",
    )
    risk_tier: str = Field(
        ...,
        description="Stratified acoustic risk tier: 'minimal', 'low', 'moderate', or 'high'",
    )


class InferenceService:
    """Singleton acoustic inference and explainability engine."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        device: Optional[str] = None,
    ):
        """Initialize models, preprocessing config, and runtime parameters.

        Args:
            settings: Optional Settings instance. Defaults to get_settings().
            device: Optional compute device string ('cpu', 'cuda', 'mps'). Defaults to 'cpu'.
        """
        self.settings = settings or get_settings()

        # Deterministic compute device (CPU by default for reproducible, reliable serving)
        if device is not None:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cpu")

        logger.info("Initializing InferenceService on device: %s", self.device)

        # 1. Load config.json contract
        artifact_dir = self.settings.resolved_model_artifact_dir
        config_path = artifact_dir / "config.json"
        if not config_path.exists():
            raise FileNotFoundError(
                f"Model artifact configuration missing at: {config_path}. "
                "Ensure models/artifact/ contains config.json, model.pt, and eval_metrics.json."
            )

        with open(config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.threshold = float(self.config.get("classification_threshold", 0.55))
        self.T = int(self.config.get("T", 199))
        self.downsample_factor = int(self.config.get("downsample_factor", 4))
        self.N = int(self.config.get("N", 50))
        self.model_version = str(self.config.get("training_run_id", self.config.get("version", "1.0.0")))
        self.risk_tiers = self.config.get("risk_tiers", {})
        self.preprocess_config = PreprocessConfig.from_dict(self.config.get("preprocess_config", {}))
        self.wavlm_checkpoint = str(self.config.get("wavlm_checkpoint", "microsoft/wavlm-base-plus"))

        # 2. Load upstream WavLM model once
        logger.info("Loading upstream acoustic foundation model: %s...", self.wavlm_checkpoint)
        self.wavlm_model = WavLMModel.from_pretrained(self.wavlm_checkpoint)
        self.wavlm_model.to(self.device)
        self.wavlm_model.eval()
        self.wavlm_model.requires_grad_(False)

        # 3. Load trained classifier (TorchScript preferred, state_dict fallback)
        export_artifacts = self.config.get("export_artifacts", {})
        ts_filename = export_artifacts.get("torchscript_model", "model.pt")
        ts_path = artifact_dir / ts_filename

        if ts_path.exists():
            try:
                logger.info("Loading TorchScript classifier model from %s...", ts_path)
                self.model = torch.jit.load(str(ts_path), map_location=self.device)
                self.model.eval()
                logger.info("TorchScript classifier loaded successfully.")
            except Exception as e:
                logger.warning("Failed to load TorchScript model: %s. Falling back to state_dict...", e)
                self.model = self._load_from_state_dict(artifact_dir, export_artifacts)
        else:
            logger.info("TorchScript model not found at %s. Loading state_dict...", ts_path)
            self.model = self._load_from_state_dict(artifact_dir, export_artifacts)

        logger.info(
            "InferenceService initialized successfully. Threshold=%.2f, ModelVersion=%s",
            self.threshold,
            self.model_version,
        )

    def _load_from_state_dict(self, artifact_dir: Path, export_artifacts: Dict[str, Any]) -> torch.nn.Module:
        """Fallback loader initializing raw architecture and restoring state_dict."""
        sd_filename = export_artifacts.get("state_dict", "model_state_dict.pt")
        sd_path = artifact_dir / sd_filename
        if not sd_path.exists():
            raise FileNotFoundError(f"Neither TorchScript model nor state_dict found in {artifact_dir}")

        model_cfg_data = self.config.get("model_config", {})
        model_config = ModelConfig.from_dict(model_cfg_data)
        model = ParkinsonsVoiceClassifier(config=model_config)
        state_dict = torch.load(str(sd_path), map_location=self.device)
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()
        model.requires_grad_(False)
        return model

    def _determine_risk_tier(self, probability: float) -> str:
        """Map screening probability score to acoustic risk tier."""
        if probability >= 0.75:
            return "high"
        elif probability >= self.threshold:
            return "moderate"
        elif probability >= 0.25:
            return "low"
        else:
            return "minimal"

    def predict(self, audio_bytes: bytes, filename: str) -> PredictionResult:
        """Run complete end-to-end inference and explainability on audio clip.

        Strictly guarantees:
        1. Non-diagnostic screening vocabulary ('parkinsons_risk_indicated' | 'low_risk_indicated').
        2. Zero audio persistence beyond request lifetime (try/finally temp file cleanup).
        3. Dynamic preprocessing parameter resolution from config.json.

        Args:
            audio_bytes: Binary contents of incoming audio file.
            filename: File name including extension for format checking.

        Returns:
            PredictionResult dataclass with risk classification and attention heatmap.
        """
        # Create temp file to satisfy secure audit / decoding verification
        suffix = Path(filename).suffix if "." in filename else ".tmp"
        temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        temp_path = Path(temp_file.name)

        try:
            temp_file.write(audio_bytes)
            temp_file.flush()
            temp_file.close()

            # 1. Validate audio format, size, duration, and silence energy
            waveform, sample_rate, original_duration_sec = validate_audio_file(
                audio_bytes=audio_bytes,
                filename=filename,
                settings=self.settings,
            )

            # 2. Preprocess audio identically to training pipeline
            processed_audio = preprocess_audio(
                waveform=waveform,
                sample_rate=sample_rate,
                config=self.preprocess_config,
            )

            # 3. Extract WavLM embeddings (shape: 1, 199, 768)
            audio_tensor = torch.from_numpy(processed_audio).unsqueeze(0).to(self.device)
            with torch.no_grad():
                wavlm_out = self.wavlm_model(audio_tensor)
                features = wavlm_out.last_hidden_state

                # 4. Classifier forward pass (shape: logit=(1, 1), attn=(1, 50))
                logit, attn_weights = self.model(features)
                prob = float(torch.sigmoid(logit).squeeze().item())

            # 5. Non-diagnostic risk assessment
            prediction = "parkinsons_risk_indicated" if prob >= self.threshold else "low_risk_indicated"
            risk_tier = self._determine_risk_tier(prob)

            # 6. Time-aligned attention explainability
            attn_1d = attn_weights.squeeze().detach().cpu().numpy()
            attention_dict = compute_time_aligned_attention(
                attention_weights=attn_1d,
                num_frames_T=self.T,
                downsample_factor=self.downsample_factor,
                original_duration_sec=self.preprocess_config.segment_seconds,
            )

            return PredictionResult(
                prediction=prediction,
                probability=round(prob, 4),
                threshold_used=round(self.threshold, 4),
                attention=attention_dict,
                audio_duration_sec=round(original_duration_sec, 2),
                model_version=self.model_version,
                risk_tier=risk_tier,
            )

        finally:
            # Guarantee temporary audio file is destroyed immediately
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError as exc:
                    logger.warning("Failed to unlink temporary audio file %s: %s", temp_path, exc)


def get_inference_service(request: Any) -> InferenceService:
    """FastAPI dependency yielding the application-level InferenceService singleton."""
    service = getattr(request.app.state, "inference_service", None)
    if service is None:
        raise RuntimeError(
            "InferenceService is not initialized on app.state. "
            "Ensure the FastAPI lifespan startup event executed successfully."
        )
    return service
