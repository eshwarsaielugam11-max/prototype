"""Transformer Encoder and Attention-Pooling Head for Parkinson's Voice Platform.

Processes the token sequence produced by the ConvNeXt V2 stem with learned
positional embeddings, multi-head self-attention layers for global temporal context,
and an attention-pooling head that returns both pooled features and raw attention
weights for clinical explainability.
"""

from typing import Tuple
import torch
import torch.nn as nn


class LearnedPositionalEncoding(nn.Module):
    """Learned 1D positional embeddings for sequence tokens."""

    def __init__(self, embed_dim: int, max_len: int = 512, std: float = 0.02):
        super().__init__()
        self.pos_embed = nn.Parameter(torch.randn(1, max_len, embed_dim) * std)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Add learned positional encoding to input token sequence.

        Args:
            x: Input sequence of shape (B, N, D).

        Returns:
            Position-encoded sequence of shape (B, N, D).
        """
        seq_len = x.shape[1]
        return x + self.pos_embed[:, :seq_len, :]


class AttentionPool(nn.Module):
    """Attention-pooling head with a learnable query attending over all tokens.

    Aggregates a variable or fixed token sequence (B, N, D) into a single summary
    representation (B, D) via multi-head cross-attention with a learnable query vector.
    Crucially returns the raw attention weights (B, N) for downstream clinical
    temporal attribution and explainability.
    """

    def __init__(self, embed_dim: int, num_heads: int = 4, std: float = 0.02):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        # Learnable global summary query (analogous to a dynamic CLS token query)
        self.query = nn.Parameter(torch.randn(1, 1, embed_dim) * std)
        self.mha = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            batch_first=True,
        )

    def forward(self, tokens: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Compute attention-pooled vector and return temporal attention weights.

        Args:
            tokens: Encoded sequence tokens of shape (B, N, D).

        Returns:
            Tuple of:
                - pooled: Summary representation of shape (B, D).
                - attention_weights: Raw attention distribution of shape (B, N).
        """
        batch_size = tokens.shape[0]
        # Repeat query across batch to ensure contiguous physical buffer across backends (CUDA, MPS, CPU)
        query = self.query.repeat(batch_size, 1, 1)

        # Multi-head attention: query attends to tokens (K=tokens, V=tokens)
        # out: (B, 1, D), weights: (B, 1, N)
        out, weights = self.mha(
            query=query,
            key=tokens,
            value=tokens,
            need_weights=True,
            average_attn_weights=True,
        )

        pooled = out.squeeze(1)               # (B, D)
        attention_weights = weights.squeeze(1) # (B, N)
        return pooled, attention_weights


class TransformerEncoderModule(nn.Module):
    """Complete Transformer Encoder stack with projection, positional encoding, and self-attention."""

    def __init__(
        self,
        in_dim: int,
        d_model: int = 256,
        nhead: int = 4,
        num_layers: int = 3,
        dim_feedforward: int = 1024,
        dropout: float = 0.1,
        max_seq_len: int = 512,
    ):
        super().__init__()
        self.proj = nn.Linear(in_dim, d_model) if in_dim != d_model else nn.Identity()
        self.pos_encoding = LearnedPositionalEncoding(embed_dim=d_model, max_len=max_seq_len)
        self.layer_norm = nn.LayerNorm(d_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(
            encoder_layer=encoder_layer,
            num_layers=num_layers,
        )

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        """Project tokens, add positional encodings, and process with Transformer.

        Args:
            tokens: Input token sequence of shape (B, N, in_dim).

        Returns:
            Contextualized tokens of shape (B, N, d_model).
        """
        tokens = self.proj(tokens)
        tokens = self.pos_encoding(tokens)
        tokens = self.layer_norm(tokens)
        return self.encoder(tokens)
