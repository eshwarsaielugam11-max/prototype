"""Transformer Encoder and Attention-Pooling modules for Parkinson's Voice Platform.

Processes the token sequence output from the ConvNeXt V2 stem, incorporating
learned positional encodings, self-attention across time frames, and a learnable
single-query attention pooling mechanism that extracts a clinical explainability map.
"""

from typing import Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class LearnedPositionalEncoding(nn.Module):
    """Learned positional embeddings for transformer tokens."""

    def __init__(self, max_seq_len: int = 512, d_model: int = 256):
        super().__init__()
        self.pos_embedding = nn.Parameter(torch.randn(1, max_seq_len, d_model) * 0.02)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seq_len = x.size(1)
        return x + self.pos_embedding[:, :seq_len, :]


class TransformerEncoderModule(nn.Module):
    """Transformer Encoder operating over downsampled temporal speech tokens."""

    def __init__(
        self,
        in_channels: int = 192,
        freq_dim: int = 48,
        d_model: int = 256,
        nhead: int = 4,
        num_layers: int = 3,
        num_tokens: int = 50,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.d_model = d_model
        self.token_proj = nn.Linear(in_channels * freq_dim, d_model)
        self.pos_embedding = nn.Parameter(torch.randn(1, num_tokens, d_model) * 0.02)
        self.dropout = nn.Dropout(dropout)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=1024,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.layer_norm = nn.LayerNorm(d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass converting feature map into contextualized token representations.

        Args:
            x: Tensor of shape (B, C=192, T'=50, F'=48) from ConvNeXt V2 stem.

        Returns:
            Tokens tensor of shape (B, T'=50, d_model=256).
        """
        B, C, T_down, F_down = x.shape
        tokens = x.permute(0, 2, 1, 3).contiguous().view(B, T_down, C * F_down)
        tokens = self.token_proj(tokens)
        tokens = self.dropout(tokens + self.pos_embedding[:, :T_down, :])
        out = self.transformer(tokens)
        return self.layer_norm(out)


class AttentionPool(nn.Module):
    """Single learnable [CLS]-style query attention pooling mechanism.

    Provides both pooled embedding representation and normalized attention weights
    over the temporal token sequence for clinical explainability / attention rollout.
    """

    def __init__(self, d_model: int = 256):
        super().__init__()
        self.d_model = d_model
        self.query = nn.Parameter(torch.randn(1, 1, d_model) * 0.02)
        self.scale = d_model ** -0.5

    def forward(self, tokens: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Aggregate tokens into a single clinical feature vector.

        Args:
            tokens: Sequence tensor of shape (B, N=50, d_model=256).

        Returns:
            Tuple of:
            - pooled: (B, d_model) aggregated embedding vector.
            - attention_weights: (B, N) normalized attention distribution summing to 1.
        """
        B = tokens.size(0)
        query = self.query.repeat(B, 1, 1)
        attn_logits = torch.bmm(query, tokens.transpose(1, 2)) * self.scale
        attn_weights = F.softmax(attn_logits, dim=-1)
        pooled = torch.bmm(attn_weights, tokens).squeeze(1)
        return pooled, attn_weights.squeeze(1)
