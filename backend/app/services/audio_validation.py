"""Audio input validation service for Parkinson's Voice Platform.

Ensures uploaded audio strictly complies with size limits, allowed extensions,
codec integrity, minimum duration, and acoustic energy constraints before
entering the neural network pipeline.
"""

from pathlib import Path
from typing import Tuple
import io
import librosa
import numpy as np
import soundfile as sf
from fastapi import HTTPException

from backend.app.config import Settings, get_settings


def validate_audio_file(
    audio_bytes: bytes,
    filename: str,
    settings: Settings = None,
    min_duration_sec: float = 0.5,
) -> Tuple[np.ndarray, int, float]:
    """Validate and decode incoming audio bytes.

    Args:
        audio_bytes: Raw binary bytes of uploaded audio file.
        filename: Name of the uploaded audio file (for extension checking).
        settings: Application settings singleton.
        min_duration_sec: Minimum acceptable recording duration in seconds.

    Returns:
        Tuple of (waveform: np.ndarray, sample_rate: int, duration_sec: float).

    Raises:
        HTTPException(400): If audio fails format, size, decoding, duration, or energy checks.
    """
    if settings is None:
        settings = get_settings()

    # 1. Check filename and extension
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=400,
            detail="Missing or invalid filename. File must include a valid audio extension.",
        )

    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in settings.allowed_formats_list:
        allowed = ", ".join(f".{ext}" for ext in settings.allowed_formats_list)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '.{extension}'. Permitted formats: {allowed}",
        )

    # 2. Check byte size
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty (0 bytes received).",
        )

    if len(audio_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file size ({len(audio_bytes) / 1024 / 1024:.1f} MB) exceeds maximum allowed limit of {settings.max_upload_mb} MB.",
        )

    # 3. Attempt decoding
    waveform = None
    sample_rate = None

    try:
        # First attempt fast in-memory soundfile decoding
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
        waveform = data
        sample_rate = sr
    except Exception:
        # Fallback to filesystem-based librosa decoding for container formats (m4a, mp4, webm, mp3, ogg)
        import tempfile
        import os

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{extension}", delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name

            data, sr = librosa.load(tmp_path, sr=None, mono=False)
            waveform = data
            sample_rate = sr
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decode audio file. Corrupted header or unsupported codec: {str(exc)}",
            ) from exc
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    # Convert to mono if multichannel
    if waveform.ndim > 1:
        waveform = np.mean(waveform, axis=-1 if waveform.shape[-1] <= 8 else 0)

    waveform = waveform.astype(np.float32)
    duration_sec = float(len(waveform) / sample_rate)

    # 4. Check duration
    if duration_sec < min_duration_sec:
        raise HTTPException(
            status_code=400,
            detail=f"Recording duration ({duration_sec:.2f}s) is too short. Minimum duration is {min_duration_sec:.1f} seconds.",
        )

    # 5. Check acoustic energy (reject pure silence)
    peak_amplitude = float(np.max(np.abs(waveform)))
    rms_energy = float(np.sqrt(np.mean(waveform ** 2)))

    if peak_amplitude < 1e-5 or rms_energy < 1e-6:
        raise HTTPException(
            status_code=400,
            detail="Audio recording contains near-total silence. Please ensure your microphone is working and speak clearly.",
        )

    return waveform, sample_rate, duration_sec
