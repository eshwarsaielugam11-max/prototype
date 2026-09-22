"""Unit tests verifying attention rollout explainability module."""

import numpy as np
import pytest
import torch

from ml.explainability.attention_rollout import (
    compute_integrated_gradients,
    compute_time_aligned_attention,
    explain_prediction,
)
from ml.model_def.model import ParkinsonsVoiceClassifier


def test_compute_time_aligned_attention_shapes_and_bounds():
    """Verify output contract, lengths, interpolation, and [0, 1] normalization."""
    raw_attention = np.array([0.1, 0.5, 0.9, 0.2, 0.05], dtype=np.float32)
    num_frames = 199
    duration = 4.0

    res = compute_time_aligned_attention(
        attention_weights=raw_attention,
        num_frames_T=num_frames,
        downsample_factor=4,
        original_duration_sec=duration,
    )

    assert "timestamps_sec" in res
    assert "attention" in res
    assert "peak_timestamp_sec" in res
    assert "downsample_factor" in res
    assert "num_frames" in res

    assert len(res["timestamps_sec"]) == num_frames
    assert len(res["attention"]) == num_frames
    assert res["timestamps_sec"][0] == 0.0
    assert abs(res["timestamps_sec"][-1] - duration) < 1e-4

    # Bounds
    attn = np.array(res["attention"])
    assert np.min(attn) >= 0.0
    assert np.max(attn) <= 1.0
    assert np.isclose(np.max(attn), 1.0)
    assert np.isclose(np.min(attn), 0.0)


def test_compute_time_aligned_attention_torch_tensor_input():
    """Verify torch Tensor inputs of shapes (N,) and (1, N) are handled transparently."""
    tensor_1d = torch.softmax(torch.randn(50), dim=-1)
    res1 = compute_time_aligned_attention(tensor_1d, num_frames_T=199)
    assert len(res1["attention"]) == 199

    tensor_2d = tensor_1d.unsqueeze(0)
    res2 = compute_time_aligned_attention(tensor_2d, num_frames_T=199)
    assert len(res2["attention"]) == 199
    assert res1["attention"] == res2["attention"]


def test_explain_prediction_api_contract():
    """Verify explain_prediction returns valid dictionary compliant with FastAPI schema."""
    model = ParkinsonsVoiceClassifier()
    model.eval()

    dummy_feature = torch.randn(1, 199, 768)
    pkg = explain_prediction(model, dummy_feature, threshold=0.55)

    assert "probability" in pkg
    assert 0.0 <= pkg["probability"] <= 1.0
    assert "logit" in pkg
    assert "is_positive" in pkg
    assert isinstance(pkg["is_positive"], bool)
    assert "risk_tier" in pkg
    assert pkg["risk_tier"] in ["High Risk", "Moderate Risk", "Low Risk", "Minimal Risk"]
    assert "decision_threshold" in pkg
    assert "explainability" in pkg
    assert len(pkg["explainability"]["timestamps_sec"]) == 199
    assert len(pkg["explainability"]["attention"]) == 199
    assert "caveat" in pkg
    assert "SHAP" not in pkg["caveat"]


def test_integrated_gradients_shape():
    """Verify integrated gradients output shape matches temporal frame count."""
    model = ParkinsonsVoiceClassifier()
    model.eval()

    dummy_feature = torch.randn(1, 50, 768)  # smaller T for fast unit test
    ig = compute_integrated_gradients(model, dummy_feature, steps=5)

    assert isinstance(ig, np.ndarray)
    assert ig.shape == (50,)
    assert 0.0 <= ig.min() <= ig.max() <= 1.0
