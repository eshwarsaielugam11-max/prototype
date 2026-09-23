import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttentionHeatmap } from './AttentionHeatmap';

describe('AttentionHeatmap Component', () => {
  it('renders valid attention timeline with peak salience badge', () => {
    const mockAttention = {
      timestamps_sec: [0.0, 0.5, 1.0, 1.5, 2.0],
      attention: [0.1, 0.4, 0.95, 0.3, 0.2],
      peak_timestamp_sec: 1.0,
      num_frames: 5,
    };

    render(<AttentionHeatmap attentionData={mockAttention} audioDurationSec={2.0} />);

    expect(screen.getByText(/Time-Aligned Attention Rollout Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Peak Salience: 1.00s/i)).toBeInTheDocument();
    expect(screen.getByText(/5 acoustic frames/i)).toBeInTheDocument();
    expect(screen.getByText(/Explainability Limitation/i)).toBeInTheDocument();
  });

  it('renders fallback when attention data is missing or empty', () => {
    render(<AttentionHeatmap attentionData={null} />);

    expect(screen.getByText(/Attention Rollout Data Unavailable/i)).toBeInTheDocument();
  });
});
