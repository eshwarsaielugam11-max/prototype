"""Attention-based explainability module for Parkinson's Voice Platform.

Implements time-aligned attention extraction and attention rollout for Transformer
speech models. Maps pooling query attention back to the physical audio time axis
for clinical explainability.

IMPORTANT SCIENTIFIC CAVEAT:
This method visualizes model self-attention weights—identifying which temporal
regions of the audio sequence most strongly contributed to the internal pooled
representation. It is a mathematical relevance indicator, NOT a certified causal
or medical biological explanation of neuropathology.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import torch
import torch.nn as nn


def compute_time_aligned_attention(
    attention_weights: Union[np.ndarray, torch.Tensor, List[float]],
    num_frames_T: int = 199,
    downsample_factor: int = 4,
    original_duration_sec: float = 4.0,
) -> Dict[str, Any]:
    """Upsample pooled attention weights from token space back to audio frame timestamps.

    Args:
        attention_weights: Normalized attention weights of shape (N,) or (1, N)
                           where N is the sequence length output from the ConvNeXt
                           downsampling stem (typically N=50).
        num_frames_T: Target temporal frame count in the upstream feature extractor
                      (typically T=199 for 4.0s WavLM features).
        downsample_factor: Temporal downsampling factor applied by the stem (~4x).
        original_duration_sec: Real-world duration of the preprocessed audio window (seconds).

    Returns:
        JSON-serializable dictionary with keys:
            - "timestamps_sec": List of float timestamps in seconds [0.0 .. original_duration_sec].
            - "attention": List of float normalized attention values in [0.0, 1.0].
            - "peak_timestamp_sec": Timestamp of the highest attention peak.
            - "downsample_factor": Integer downsample factor.
            - "num_frames": Integer frame count matching len(timestamps_sec).
    """
    # 1. Convert to 1D float32 numpy array
    if isinstance(attention_weights, torch.Tensor):
        weights = attention_weights.detach().cpu().numpy()
    else:
        weights = np.asarray(attention_weights, dtype=np.float32)

    weights = weights.flatten()
    n_tokens = len(weights)

    if n_tokens == 0:
        raise ValueError("attention_weights must not be empty.")

    # 2. Source and target time coordinates
    src_x = np.linspace(0.0, float(original_duration_sec), n_tokens)
    target_x = np.linspace(0.0, float(original_duration_sec), int(num_frames_T))

    # 3. 1D Linear interpolation from N tokens back to T frames
    interpolated = np.interp(target_x, src_x, weights)

    # 4. Min-max normalization to [0.0, 1.0] for clinical visualization
    min_val = float(np.min(interpolated))
    max_val = float(np.max(interpolated))
    denom = max_val - min_val

    if denom > 1e-8:
        norm_attention = (interpolated - min_val) / denom
    else:
        norm_attention = np.ones_like(interpolated, dtype=np.float32)

    peak_idx = int(np.argmax(norm_attention))
    peak_time = float(target_x[peak_idx])

    return {
        "timestamps_sec": [round(float(t), 4) for t in target_x],
        "attention": [round(float(a), 4) for a in norm_attention],
        "peak_timestamp_sec": round(peak_time, 4),
        "downsample_factor": int(downsample_factor),
        "num_frames": int(num_frames_T),
    }


def explain_prediction(
    model: nn.Module,
    feature_tensor: torch.Tensor,
    num_frames_T: int = 199,
    downsample_factor: int = 4,
    original_duration_sec: float = 4.0,
    threshold: float = 0.55,
) -> Dict[str, Any]:
    """Execute model inference and generate full clinical explainability package.

    Args:
        model: ParkinsonsVoiceClassifier model in eval mode.
        feature_tensor: Feature tensor of shape (1, 199, 768) or (199, 768).
        num_frames_T: Expected WavLM temporal frames.
        downsample_factor: Stem temporal downsample factor.
        original_duration_sec: Segment length in seconds.
        threshold: Decision threshold for binary classification.

    Returns:
        Dictionary containing prediction results, probabilities, and time-aligned attention.
    """
    model.eval()
    if feature_tensor.ndim == 2:
        feature_tensor = feature_tensor.unsqueeze(0)

    device = next(model.parameters()).device
    feature_tensor = feature_tensor.to(device)

    with torch.no_grad():
        logit, attn_weights = model(feature_tensor)
        prob = float(torch.sigmoid(logit).cpu().item())

    attn_1d = attn_weights.squeeze().cpu().numpy()
    aligned_attn = compute_time_aligned_attention(
        attention_weights=attn_1d,
        num_frames_T=num_frames_T,
        downsample_factor=downsample_factor,
        original_duration_sec=original_duration_sec,
    )

    is_positive = bool(prob >= threshold)
    risk_tier = (
        "High Risk" if prob >= 0.75
        else ("Moderate Risk" if prob >= threshold
        else ("Low Risk" if prob >= 0.25 else "Minimal Risk"))
    )

    return {
        "probability": round(prob, 4),
        "logit": round(float(logit.cpu().item()), 4),
        "is_positive": is_positive,
        "risk_tier": risk_tier,
        "decision_threshold": round(float(threshold), 2),
        "explainability": aligned_attn,
        "caveat": (
            "Attention rollout visualizes model internal feature salience across time; "
            "it is not certified causal proof of pathology."
        ),
    }


def compute_integrated_gradients(
    model: nn.Module,
    input_tensor: torch.Tensor,
    steps: int = 20,
    baseline: Optional[torch.Tensor] = None,
) -> np.ndarray:
    """Numerical Integrated Gradients cross-check for attention validation.

    Args:
        model: Model in eval mode.
        input_tensor: Input tensor of shape (1, T, 768).
        steps: Number of integration steps (Riemann sum).
        baseline: Optional baseline tensor (defaults to zeros).

    Returns:
        1D temporal salience array of shape (T,) normalized to [0, 1].
    """
    model.eval()
    if input_tensor.ndim == 2:
        input_tensor = input_tensor.unsqueeze(0)

    device = next(model.parameters()).device
    x = input_tensor.to(device).clone().requires_grad_(False)

    if baseline is None:
        baseline = torch.zeros_like(x)
    else:
        baseline = baseline.to(device)

    # Scaled inputs along the straight line from baseline to input
    alphas = torch.linspace(0.0, 1.0, steps, device=device)
    total_grads = torch.zeros_like(x)

    for alpha in alphas:
        interpolated_x = (baseline + alpha * (x - baseline)).clone().detach().requires_grad_(True)
        logit, _ = model(interpolated_x)
        logit.backward()
        total_grads += interpolated_x.grad.detach()

    avg_grads = total_grads / steps
    integrated_grads = (x - baseline) * avg_grads

    # Aggregate over feature channels: (1, T, 768) -> (T,)
    temporal_salience = torch.norm(integrated_grads.squeeze(0), p=2, dim=-1).cpu().numpy()

    # Min-max scale
    s_min, s_max = temporal_salience.min(), temporal_salience.max()
    if s_max - s_min > 1e-8:
        temporal_salience = (temporal_salience - s_min) / (s_max - s_min)
    else:
        temporal_salience = np.zeros_like(temporal_salience)

    return temporal_salience
