"""Complete Parkinson's Voice Classification Model.

Wires ConvNeXt V2 convolutional stem -> Transformer Encoder -> Attention-Pooling
-> 2-layer MLP classification head. Adheres strictly to the stable forward contract
returning `(logit, attention_weights)`.
"""

from dataclasses import asdict, dataclass, field
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn

from ml.model_def.convnextv2_stem import ConvNeXtV2Stem
from ml.model_def.transformer_encoder import AttentionPool, TransformerEncoderModule


@dataclass
class ModelConfig:
    """Hyperparameters and architectural configuration for ParkinsonsVoiceClassifier."""

    feature_dim: int = 768
    temporal_frames: int = 199
    stem_channels: List[int] = field(default_factory=lambda: [48, 96, 192])
    stem_depths: List[int] = field(default_factory=lambda: [2, 2, 4])
    transformer_dim: int = 256
    transformer_layers: int = 3
    transformer_heads: int = 4
    transformer_ffn_dim: int = 1024
    dropout: float = 0.3
    mlp_hidden_dim: int = 128
    num_classes: int = 1

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModelConfig":
        """Create configuration instance from dictionary."""
        valid_keys = {
            "feature_dim",
            "temporal_frames",
            "stem_channels",
            "stem_depths",
            "transformer_dim",
            "transformer_layers",
            "transformer_heads",
            "transformer_ffn_dim",
            "dropout",
            "mlp_hidden_dim",
            "num_classes",
        }
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)

    @classmethod
    def from_json(cls, json_path: Union[str, Path]) -> "ModelConfig":
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


class ParkinsonsVoiceClassifier(nn.Module):
    """Hybrid ConvNeXt V2 + Transformer classification model for Parkinson's screening.

    Pipeline:
        1. ConvNeXt V2 Atto-scale Stem: (B, 1, T=199, F=768) -> (B, C=192, T'=50, F'=48)
        2. Flatten frequency dim & Project: (B, T'=50, C*F') -> (B, T'=50, D=256)
        3. Transformer Encoder Stack: 3 layers, 4 heads, D=256 with learned positional encodings
        4. Attention-Pooling Head: Single learnable query attends over T'=50 tokens -> (B, D=256)
        5. MLP Classifier Head: Linear(256, 128) -> GELU -> Dropout(0.3) -> Linear(128, 1) -> logit

    Forward Return Contract:
        Always returns `(logit, attention_weights)` where:
        - logit: Tensor of shape (B, 1) containing unnormalized log-odds of Parkinson's.
        - attention_weights: Tensor of shape (B, 50) containing normalized query attention weights
          across the temporal token sequence for clinical explainability.
    """

    def __init__(self, config: Optional[ModelConfig] = None):
        super().__init__()
        self.config = config or ModelConfig()

        # 1. Atto-scale ConvNeXt V2 Stem
        self.stem = ConvNeXtV2Stem(
            in_features=self.config.feature_dim,
            channels=tuple(self.config.stem_channels),
            depths=tuple(self.config.stem_depths),
        )

        # 2. Transformer Encoder Stack with learned positional encodings
        self.encoder = TransformerEncoderModule(
            in_channels=self.config.stem_channels[-1],
            freq_dim=48,
            d_model=self.config.transformer_dim,
            nhead=self.config.transformer_heads,
            num_layers=self.config.transformer_layers,
            num_tokens=50,
            dropout=self.config.dropout,
        )

        # 3. Attention-Pooling Head with learnable query
        self.pool = AttentionPool(d_model=self.config.transformer_dim)

        # 4. Classification Head (Linear -> GELU -> Dropout(0.3) -> Linear -> 1 logit)
        self.head = nn.Sequential(
            nn.Linear(self.config.transformer_dim, self.config.mlp_hidden_dim),
            nn.GELU(),
            nn.Dropout(self.config.dropout),
            nn.Linear(self.config.mlp_hidden_dim, self.config.num_classes),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass adhering to the (logit, attention_weights) contract.

        Args:
            x: Input tensor of shape (B, T=199, F=768) or (B, 1, T=199, F=768).

        Returns:
            Tuple of:
            - logit: Tensor of shape (B, 1) representing unnormalized log-odds.
            - attention_weights: Tensor of shape (B, 50) representing normalized temporal attention.
        """
        # 1. Convolutional stem
        x = self.stem(x)

        # 2. Transformer sequence modeling
        tokens = self.encoder(x)

        # 3. Attention-based query pooling
        pooled, attention_weights = self.pool(tokens)

        # 4. Classification MLP (B, 1)
        logits = self.head(pooled)

        return logits, attention_weights

    def count_parameters(self) -> Dict[str, int]:
        """Count total and per-module trainable parameters."""
        stem_p = sum(p.numel() for p in self.stem.parameters() if p.requires_grad)
        enc_p = sum(p.numel() for p in self.encoder.parameters() if p.requires_grad)
        pool_p = sum(p.numel() for p in self.pool.parameters() if p.requires_grad)
        head_p = sum(p.numel() for p in self.head.parameters() if p.requires_grad)
        total_p = stem_p + enc_p + pool_p + head_p
        return {
            "stem": stem_p,
            "encoder": enc_p,
            "attention_pool": pool_p,
            "head": head_p,
            "total": total_p,
        }


def load_trained_model(
    checkpoint_path: Union[str, Path] = "models/artifact/best_model.pt",
    device: str = "cpu",
) -> ParkinsonsVoiceClassifier:
    """Convenience factory function to instantiate and load the trained classifier weights.

    Args:
        checkpoint_path: Path to the .pt checkpoint file.
        device: Device to map tensors onto ('cpu', 'cuda', or 'mps').

    Returns:
        ParkinsonsVoiceClassifier with trained weights loaded in evaluation mode.
    """
    path = Path(checkpoint_path)
    if not path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {path.resolve()}")

    model = ParkinsonsVoiceClassifier()
    state_dict = torch.load(str(path), map_location=device)
    if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
        state_dict = state_dict["model_state_dict"]

    model.load_state_dict(state_dict, strict=True)
    model.to(device)
    model.eval()
    return model
