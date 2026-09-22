"""Audio preprocessing pipeline for Parkinson's Voice Platform.

This module provides a framework-agnostic audio preprocessing function and configuration
dataclass shared identically between offline Colab training notebooks and the local
FastAPI backend inference runtime to ensure complete train/inference parity.
"""

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Dict, Union

import librosa
import numpy as np


@dataclass
class PreprocessConfig:
    """Configuration parameters for audio preprocessing."""

    target_sr: int = 16000
    trim_top_db: int = 30
    normalize: bool = True
    segment_seconds: float = 4.0
    pad_mode: str = "repeat"  # "repeat" or "zero"

    @property
    def target_samples(self) -> int:
        """Calculate total number of samples for the fixed segment window."""
        return int(round(self.segment_seconds * self.target_sr))

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PreprocessConfig":
        """Create config instance from dictionary."""
        valid_keys = {
            "target_sr",
            "trim_top_db",
            "normalize",
            "segment_seconds",
            "pad_mode",
        }
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)

    @classmethod
    def from_json(cls, json_path: Union[str, Path]) -> "PreprocessConfig":
        """Load configuration from JSON file."""
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    def to_json(self, json_path: Union[str, Path]) -> None:
        """Save configuration to JSON file."""
        path = Path(json_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)


def preprocess_audio(
    waveform: np.ndarray,
    sample_rate: int,
    config: PreprocessConfig,
) -> np.ndarray:
    """Preprocess raw audio waveform to standard model input representation.

    Processing pipeline:
    1. Channel reduction (stereo/multichannel -> mono)
    2. Resampling to config.target_sr (16 kHz)
    3. Leading/trailing silence trimming via energy threshold (config.trim_top_db)
    4. Peak amplitude normalization to [-1.0, 1.0]
    5. Fixed-length segmentation with repeat/zero padding to (segment_seconds * target_sr) samples.

    Args:
        waveform: Input audio array of shape (samples,) or (channels, samples).
        sample_rate: Sampling rate of input audio in Hz.
        config: PreprocessConfig instance specifying target sample rate, trimming,
            normalization, segment duration, and padding mode.

    Returns:
        Preprocessed 1D float32 numpy array of shape (config.target_samples,).
    """
    if waveform is None or waveform.size == 0:
        raise ValueError("Input waveform cannot be None or empty.")

    # 1. Convert to floating-point representation
    if np.issubdtype(waveform.dtype, np.integer):
        max_val = float(np.iinfo(waveform.dtype).max)
        waveform = waveform.astype(np.float32) / max_val
    else:
        waveform = waveform.astype(np.float32)

    # 2. Convert to mono if multichannel
    if waveform.ndim > 1:
        # Check if shape is (channels, samples) or (samples, channels)
        if waveform.shape[0] < waveform.shape[1] and waveform.shape[0] <= 8:
            waveform = np.mean(waveform, axis=0)
        else:
            waveform = np.mean(waveform, axis=-1)
    waveform = waveform.flatten()

    # 3. Resample to target sample rate if necessary
    if sample_rate != config.target_sr:
        waveform = librosa.resample(
            waveform,
            orig_sr=sample_rate,
            target_sr=config.target_sr,
        )

    # 4. Trim leading and trailing silence
    # top_db=30 trims sound lower than 30dB below peak energy
    trimmed, _ = librosa.effects.trim(waveform, top_db=config.trim_top_db)

    # Safety fallback if trimming collapsed entire array (e.g. pure silent file)
    if len(trimmed) == 0:
        trimmed = waveform if len(waveform) > 0 else np.zeros(config.target_samples, dtype=np.float32)

    # 5. Peak amplitude normalization to [-1.0, 1.0]
    if config.normalize:
        peak = np.max(np.abs(trimmed))
        if peak > 1e-8:
            trimmed = trimmed / peak

    # 6. Fixed-length segmentation / padding
    target_samples = config.target_samples
    curr_len = len(trimmed)

    if curr_len > target_samples:
        # Crop leading segment
        output = trimmed[:target_samples]
    elif curr_len < target_samples:
        if config.pad_mode == "repeat":
            # Repeat-pad short clips rather than zero-pad to avoid diluting self-supervised signal
            num_repeats = int(np.ceil(target_samples / max(curr_len, 1)))
            tiled = np.tile(trimmed, num_repeats)
            output = tiled[:target_samples]
        else:
            # Zero-padding fallback
            output = np.pad(
                trimmed,
                (0, target_samples - curr_len),
                mode="constant",
                constant_values=0.0,
            )
    else:
        output = trimmed

    return np.ascontiguousarray(output, dtype=np.float32)
