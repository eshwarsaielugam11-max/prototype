"""ConvNeXt V2 convolutional stem for Parkinson's Voice Platform.

Implements an Atto-scale ConvNeXt V2 feature extraction stem designed to process
2D representations of upstream WavLM frame embeddings of shape (B, 1, T, 768).
Features Global Response Normalization (GRN) and depthwise separable convolutions
trained entirely from scratch without ImageNet dependencies.
"""

from typing import List, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class GRN(nn.Module):
    """Global Response Normalization (GRN) layer from ConvNeXt V2.

    Improves inter-channel feature diversity and prevents feature collapse
    in small-scale depthwise convolutional networks.
    """

    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.gamma = nn.Parameter(torch.zeros(1, 1, 1, dim))
        self.beta = nn.Parameter(torch.zeros(1, 1, 1, dim))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        gx = torch.norm(x, p=2, dim=(1, 2), keepdim=True)
        nx = gx / (gx.mean(dim=-1, keepdim=True) + self.eps)
        return self.gamma * (x * nx) + self.beta + x


# Backward-compatible alias
GlobalResponseNorm = GRN


class ConvNeXtV2Block(nn.Module):
    """ConvNeXt V2 building block with 7x7 Depthwise Conv, GRN, and Inverted Bottleneck."""

    def __init__(self, dim: int):
        super().__init__()
        self.dwconv = nn.Conv2d(dim, dim, kernel_size=7, padding=3, groups=dim)
        self.norm = nn.LayerNorm(dim, eps=1e-6)
        self.pwconv1 = nn.Linear(dim, 4 * dim)
        self.act = nn.GELU()
        self.grn = GRN(4 * dim)
        self.pwconv2 = nn.Linear(4 * dim, dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = self.dwconv(x)
        x = x.permute(0, 2, 3, 1).contiguous()
        x = self.norm(x)
        x = self.pwconv1(x)
        x = self.act(x)
        x = self.grn(x)
        x = self.pwconv2(x)
        x = x.permute(0, 3, 1, 2).contiguous()
        return residual + x


class ConvNeXtV2Stem(nn.Module):
    """Atto-scale ConvNeXt V2 stem with progressive spatial-temporal downsampling.

    Input shape:  (B, 1, T=199, F=768)
    Output shape: (B, channels[-1]=192, T'=50, F'=48)
    """

    def __init__(
        self,
        in_features: int = 768,
        channels: Tuple[int, ...] = (48, 96, 192),
        depths: Tuple[int, ...] = (2, 2, 4),
    ):
        super().__init__()
        self.channels = list(channels)
        self.depths = list(depths)
        self.out_channels = channels[-1]

        self.initial_proj = nn.Sequential(
            nn.Conv2d(1, channels[0], kernel_size=(3, 7), stride=(1, 4), padding=(1, 3)),
            nn.GroupNorm(1, channels[0]),
        )
        self.stages = nn.ModuleList()
        curr_dim = channels[0]
        for stage_idx in range(len(channels)):
            stage_blocks = []
            if stage_idx > 0:
                downsample = nn.Sequential(
                    nn.GroupNorm(1, curr_dim),
                    nn.Conv2d(curr_dim, channels[stage_idx], kernel_size=(3, 3), stride=(2, 2), padding=(1, 1)),
                )
                stage_blocks.append(downsample)
                curr_dim = channels[stage_idx]
            for _ in range(depths[stage_idx]):
                stage_blocks.append(ConvNeXtV2Block(curr_dim))
            self.stages.append(nn.Sequential(*stage_blocks))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through stem stages.

        Args:
            x: Input tensor of shape (B, 1, T, F) or (B, T, F).

        Returns:
            Feature map of shape (B, channels[-1], T', F').
        """
        if x.ndim == 3:
            x = x.unsqueeze(1)
        x = self.initial_proj(x)
        for stage in self.stages:
            x = stage(x)
        return x
