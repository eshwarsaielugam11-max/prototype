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


class LayerNorm2d(nn.Module):
    """Channel-wise 2D Layer Normalization for (B, C, H, W) tensors."""

    def __init__(self, num_channels: int, eps: float = 1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(num_channels))
        self.bias = nn.Parameter(torch.zeros(num_channels))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Compute mean and variance along channel axis
        mean = x.mean(dim=1, keepdim=True)
        var = (x - mean).pow(2).mean(dim=1, keepdim=True)
        x_norm = (x - mean) / torch.sqrt(var + self.eps)
        return self.weight[:, None, None] * x_norm + self.bias[:, None, None]


class GlobalResponseNorm(nn.Module):
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
        # x is formatted in channels-last: (B, H, W, C)
        gx = torch.norm(x, p=2, dim=(1, 2), keepdim=True)
        nx = gx / (gx.mean(dim=-1, keepdim=True) + self.eps)
        return self.gamma * (x * nx) + self.beta + x


class ConvNeXtV2Block(nn.Module):
    """ConvNeXt V2 building block with 7x7 Depthwise Conv, GRN, and Inverted Bottleneck."""

    def __init__(self, dim: int, mlp_ratio: int = 4, drop_path: float = 0.0):
        super().__init__()
        # 7x7 depthwise convolution for wide receptive field
        self.dwconv = nn.Conv2d(dim, dim, kernel_size=7, padding=3, groups=dim)
        self.norm = nn.LayerNorm(dim, eps=1e-6)
        # Pointwise expansion
        self.pwconv1 = nn.Linear(dim, mlp_ratio * dim)
        self.act = nn.GELU()
        self.grn = GlobalResponseNorm(mlp_ratio * dim)
        # Pointwise projection
        self.pwconv2 = nn.Linear(mlp_ratio * dim, dim)
        self.drop_path = drop_path

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        shortcut = x
        x = self.dwconv(x)
        # Permute to channels-last for LayerNorm & Linear layers
        x = x.permute(0, 2, 3, 1)  # (B, H, W, C)
        x = self.norm(x)
        x = self.pwconv1(x)
        x = self.act(x)
        x = self.grn(x)
        x = self.pwconv2(x)
        x = x.permute(0, 3, 1, 2)  # (B, C, H, W)
        return shortcut + x


class ConvNeXtV2Stem(nn.Module):
    """Atto-scale ConvNeXt V2 stem with progressive spatial-temporal downsampling.

    Input shape:  (B, 1, T=199, F=768)
    Output shape: (B, C_out, T'=50, F'=96) (~4x downsampling along time T)
    """

    def __init__(
        self,
        in_channels: int = 1,
        channels: List[int] = None,
        depths: List[int] = None,
    ):
        super().__init__()
        if channels is None:
            channels = [48, 96, 192]
        if depths is None:
            depths = [2, 2, 4]

        self.channels = channels
        self.depths = depths
        self.out_channels = channels[-1]

        # Stage 0: Initial patch stem downsampling by (2, 2)
        # Input (199, 768) -> (100, 384)
        self.stem = nn.Sequential(
            nn.Conv2d(in_channels, channels[0], kernel_size=(3, 4), stride=(2, 2), padding=(1, 1)),
            LayerNorm2d(channels[0]),
        )
        self.stage0 = nn.Sequential(
            *[ConvNeXtV2Block(channels[0]) for _ in range(depths[0])]
        )

        # Stage 1: Downsampling by (2, 2) along (T, F)
        # (100, 384) -> (50, 192)
        self.down1 = nn.Sequential(
            LayerNorm2d(channels[0]),
            nn.Conv2d(channels[0], channels[1], kernel_size=2, stride=2),
        )
        self.stage1 = nn.Sequential(
            *[ConvNeXtV2Block(channels[1]) for _ in range(depths[1])]
        )

        # Stage 2: Downsample only along frequency F (stride=(1, 2)) to keep T'=50
        # (50, 192) -> (50, 96)
        self.down2 = nn.Sequential(
            LayerNorm2d(channels[1]),
            nn.Conv2d(channels[1], channels[2], kernel_size=(1, 2), stride=(1, 2)),
        )
        self.stage2 = nn.Sequential(
            *[ConvNeXtV2Block(channels[2]) for _ in range(depths[2])]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through stem stages.

        Args:
            x: Input tensor of shape (B, 1, T, F) or (B, T, F).

        Returns:
            Feature map of shape (B, channels[-1], T', F').
        """
        if x.ndim == 3:
            x = x.unsqueeze(1)

        x = self.stem(x)
        x = self.stage0(x)
        x = self.down1(x)
        x = self.stage1(x)
        x = self.down2(x)
        x = self.stage2(x)
        return x
