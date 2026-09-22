"""Smoke test suite verifying model architecture, shapes, parameter counts, and contracts."""

import json
from pathlib import Path
import pytest
import torch

from ml.model_def.model import ModelConfig, ParkinsonsVoiceClassifier

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = PROJECT_ROOT / "ml" / "model_def" / "model_config.json"


def test_model_config_loading():
    """Verify model_config.json matches ModelConfig dataclass defaults and loads correctly."""
    assert CONFIG_PATH.exists(), f"Configuration file not found: {CONFIG_PATH}"
    config = ModelConfig.from_json(CONFIG_PATH)

    assert config.feature_dim == 768
    assert config.temporal_frames == 199
    assert config.stem_channels == [48, 96, 192]
    assert config.stem_depths == [2, 2, 4]
    assert config.transformer_dim == 256
    assert config.transformer_layers == 3
    assert config.transformer_heads == 4
    assert config.dropout == 0.3
    assert config.num_classes == 1


def test_model_parameter_budget():
    """Verify total parameter count is under the 8M budget (expected Atto-scale: ~3-5M)."""
    config = ModelConfig.from_json(CONFIG_PATH)
    model = ParkinsonsVoiceClassifier(config)

    param_counts = model.count_parameters()
    total_params = param_counts["total"]

    print("\n=== MODEL PARAMETER AUDIT ===")
    print(f"  ConvNeXt V2 Stem:   {param_counts['stem']:,} params")
    print(f"  Transformer Stack:  {param_counts['encoder']:,} params")
    print(f"  Attention Pool:     {param_counts['attention_pool']:,} params")
    print(f"  Classification MLP: {param_counts['head']:,} params")
    print(f"  -------------------------------------------")
    print(f"  Total Parameters:   {total_params:,} ({total_params / 1e6:.2f}M)")

    # Assert within budget
    assert total_params < 8_000_000, f"Parameter count {total_params} exceeds 8M budget!"
    assert 2_000_000 <= total_params <= 6_000_000, f"Parameter count {total_params} out of expected Atto range!"


def test_model_forward_shapes():
    """Verify forward pass on dummy batch (2, T, 768) returns (2, 1) logits and (2, N) attention weights."""
    config = ModelConfig.from_json(CONFIG_PATH)
    model = ParkinsonsVoiceClassifier(config)
    model.eval()

    batch_size = 2
    T = config.temporal_frames  # 199
    D = config.feature_dim       # 768

    dummy_batch = torch.randn(batch_size, T, D)

    with torch.no_grad():
        logit, attention_weights = model(dummy_batch)

    # Output assertions
    assert logit.shape == (batch_size, 1), f"Expected logit shape ({batch_size}, 1), got {logit.shape}"
    assert attention_weights.ndim == 2, f"Expected 2D attention weights, got {attention_weights.shape}"
    assert attention_weights.shape[0] == batch_size, f"Batch dimension mismatch: {attention_weights.shape[0]} != {batch_size}"

    actual_N = attention_weights.shape[1]
    print(f"\n✓ Output verification passed:")
    print(f"  - Logit shape:             {tuple(logit.shape)} (B={batch_size}, Classes=1)")
    print(f"  - Attention weights shape: {tuple(attention_weights.shape)} (B={batch_size}, N={actual_N} tokens)")

    # Verify attention weights are normalized probabilities (sum to 1 per batch item)
    weight_sums = attention_weights.sum(dim=-1)
    assert torch.allclose(weight_sums, torch.ones(batch_size), atol=1e-5), f"Attention weights do not sum to 1: {weight_sums}"
    print(f"  - Attention weights probability sum check: PASS (sums={weight_sums.tolist()})")

    # Also test with 4D input (B, 1, T, D)
    dummy_4d = dummy_batch.unsqueeze(1)
    with torch.no_grad():
        logit_4d, attn_4d = model(dummy_4d)
    assert logit_4d.shape == (batch_size, 1)
    assert attn_4d.shape == (batch_size, actual_N)
    assert torch.allclose(logit, logit_4d, atol=1e-5)
    print("  - 4D input compatibility check: PASS")


def test_model_backward_pass():
    """Verify gradients propagate end-to-end through stem, transformer, attention pool, and head."""
    config = ModelConfig.from_json(CONFIG_PATH)
    model = ParkinsonsVoiceClassifier(config)
    model.train()

    dummy_batch = torch.randn(2, config.temporal_frames, config.feature_dim)
    dummy_target = torch.tensor([[1.0], [0.0]])

    logit, attn_weights = model(dummy_batch)
    criterion = torch.nn.BCEWithLogitsLoss()
    loss = criterion(logit, dummy_target)

    loss.backward()

    # Check gradients exist and are non-zero across components
    assert model.head[-1].weight.grad is not None
    assert model.head[-1].weight.grad.abs().sum() > 0
    assert model.pool.query.grad is not None
    assert model.pool.query.grad.abs().sum() > 0
    assert model.stem.stem[0].weight.grad is not None
    assert model.stem.stem[0].weight.grad.abs().sum() > 0

    print(f"✓ Backward pass verification passed: gradients propagated successfully across all components (Loss={loss.item():.4f}).")


if __name__ == "__main__":
    print("Running model test suite...")
    test_model_config_loading()
    test_model_parameter_budget()
    test_model_forward_shapes()
    test_model_backward_pass()
    print("\nALL SMOKE TESTS PASSED!")
