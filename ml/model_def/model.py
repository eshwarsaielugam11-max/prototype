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
        1. ConvNeXt V2 Atto-scale Stem: (B, 1, T=199, F=768) -> (B, C=192, T'=50, F'=96)
        2. Temporal Token Conversion: Pool frequency F' -> (B, T'=50, C=192)
        3. Transformer Encoder Stack: 3 layers, 4 heads, D=256 with learned positional encodings
        4. Attention-Pooling Head: Single learnable query attends over T' tokens -> (B, D=256)
        5. MLP Classifier Head: Linear(256, 128) -> GELU -> Dropout(0.3) -> Linear(128, 1) -> logit

    Forward Return Contract:
        Always returns `(logit, attention_weights)` where:
        - logit: Tensor of shape (B, 1) containing unnormalized log-odds of Parkinson's.
        - attention_weights: Tensor of shape (B, N) containing normalized query attention weights
          across the temporal token sequence for clinical explainability.
    """

    def __init__(self, config: Optional[ModelConfig] = None):
        super().__init__()
        self.config = config or ModelConfig()

        # 1. Atto-scale ConvNeXt V2 Stem
        self.stem = ConvNeXtV2Stem(
            in_channels=1,
            channels=self.config.stem_channels,
            depths=self.config.stem_depths,
        )
        stem_out_dim = self.config.stem_channels[-1]

        # 2. Transformer Encoder Stack with learned positional encodings
        self.encoder = TransformerEncoderModule(
            in_dim=stem_out_dim,
            d_model=self.config.transformer_dim,
            nhead=self.config.transformer_heads,
            num_layers=self.config.transformer_layers,
            dim_feedforward=self.config.transformer_ffn_dim,
            dropout=0.1,  # Standard encoder internal dropout
            max_seq_len=512,
        )

        # 3. Attention-Pooling Head with learnable query
        self.pool = AttentionPool(
            embed_dim=self.config.transformer_dim,
            num_heads=self.config.transformer_heads,
        )

        # 4. Classification Head (Linear -> GELU -> Dropout(0.3) -> Linear -> 1 logit)
        self.head = nn.Sequential(
            nn.Linear(self.config.transformer_dim, self.config.mlp_hidden_dim),
            nn.GELU(),
            nn.Dropout(self.config.dropout),
            nn.Linear(self.config.mlp_hidden_dim, self.config.num_classes),
        )

        self._init_weights()

    def _init_weights(self):
        """Initialize weights using standard truncated normal / Xavier init."""
        for m in self.modules():
            if isinstance(m, (nn.Linear, nn.Conv2d)):
                nn.init.trunc_normal_(m.weight, std=0.02)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, (nn.LayerNorm, nn.GroupNorm)):
                if m.weight is not None:
                    nn.init.ones_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def count_parameters(self) -> Dict[str, int]:
        """Count parameters across submodules and total."""
        stem_p = sum(p.numel() for p in self.stem.parameters() if p.requires_grad)
        enc_p = sum(p.numel() for p in self.encoder.parameters() if p.requires_grad)
        pool_p = sum(p.numel() for p in self.pool.parameters() if p.requires_grad)
        head_p = sum(p.numel() for p in self.head.parameters() if p.requires_grad)
        total_p = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return {
            "stem": stem_p,
            "encoder": enc_p,
            "attention_pool": pool_p,
            "head": head_p,
            "total": total_p,
        }

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass through the full classification architecture.

        Args:
            x: Input cached WavLM features of shape (B, T, 768) or (B, 1, T, 768).

        Returns:
            Tuple of (logit, attention_weights):
                - logit: Tensor of shape (B, 1)
                - attention_weights: Tensor of shape (B, N)
        """
        # Ensure 4D shape: (B, 1, T, F)
        if x.ndim == 3:
            x = x.unsqueeze(1)

        # 1. ConvNeXt V2 Stem: (B, 1, 199, 768) -> (B, 192, T'=50, F'=96)
        feat_map = self.stem(x)

        # 2. Pool frequency axis to create temporal token sequence:
        # (B, C=192, T'=50, F'=96) -> (B, C=192, T'=50)
        temporal_feat = feat_map.mean(dim=-1)

        # 3. Permute to (B, N=T', C=192)
        tokens = temporal_feat.permute(0, 2, 1)

        # 4. Contextualize tokens with Transformer Encoder: (B, N=50, D=256)
        encoded_tokens = self.encoder(tokens)

        # 5. Attention-pool over all N tokens: (B, D=256), attention_weights: (B, N=50)
        pooled_feat, attention_weights = self.pool(encoded_tokens)

        # 6. Classification head: (B, 256) -> (B, 1)
        logit = self.head(pooled_feat)

        return logit, attention_weights
