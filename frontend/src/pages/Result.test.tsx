import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from './Result';
import * as client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getHistoryItem: vi.fn(),
    generateReport: vi.fn(),
  };
});

describe('Result Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No Screening Record Selected" when no ID is in params', () => {
    render(
      <MemoryRouter initialEntries={['/result']}>
        <Routes>
          <Route path="/result" element={<Result />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/No Screening Record Selected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Live Record/i })).toBeInTheDocument();
  });

  it('fetches and renders an elevated risk screening record with attention data', async () => {
    const mockRecord: client.TestRecordResponse = {
      id: 'rec-12345',
      test_id: 'PATIENT-001',
      source: 'recording',
      prediction: 'parkinsons_risk_indicated',
      probability: 0.854,
      threshold_used: 0.5,
      audio_duration_sec: 4.25,
      model_version: 'wav2vec2-parkinsons-v1',
      attention_heatmap_json: JSON.stringify({
        timestamps_sec: [0.0, 1.0, 2.0, 3.0, 4.0],
        attention: [0.1, 0.4, 0.9, 0.3, 0.1],
        peak_timestamp_sec: 2.0,
      }),
      has_report: false,
      created_at: '2026-03-20T10:00:00Z',
    };

    vi.mocked(client.getHistoryItem).mockResolvedValueOnce(mockRecord);

    render(
      <MemoryRouter initialEntries={['/result/rec-12345']}>
        <Routes>
          <Route path="/result/:id" element={<Result />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Retrieving Acoustic Screening Record/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/ELEVATED ACOUSTIC RISK INDICATED/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/85.4%/i)).toBeInTheDocument();
    expect(screen.getByText(/PATIENT-001/i)).toBeInTheDocument();
    expect(screen.getByText(/4.25 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/Time-Aligned Attention Rollout Heatmap/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Full Decision Support Report/i })).toBeInTheDocument();
  });

  it('renders low risk indication correctly and shows view report link if report exists', async () => {
    const mockRecord: client.TestRecordResponse = {
      id: 'rec-67890',
      test_id: null,
      source: 'upload',
      prediction: 'low_risk_indicated',
      probability: 0.123,
      threshold_used: 0.5,
      audio_duration_sec: 3.0,
      model_version: 'wav2vec2-parkinsons-v1',
      attention_heatmap_json: null,
      has_report: true,
      created_at: '2026-03-20T11:00:00Z',
    };

    vi.mocked(client.getHistoryItem).mockResolvedValueOnce(mockRecord);

    render(
      <MemoryRouter initialEntries={['/result/rec-67890']}>
        <Routes>
          <Route path="/result/:id" element={<Result />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/LOW ACOUSTIC RISK INDICATED/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/12.3%/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Synthesized Report/i })).toHaveAttribute(
      'href',
      '/report/rec-67890'
    );
  });

  it('handles error state and provides retry button', async () => {
    vi.mocked(client.getHistoryItem).mockRejectedValueOnce(
      new client.ApiError(404, 'Record not found')
    );

    render(
      <MemoryRouter initialEntries={['/result/rec-not-found']}>
        <Routes>
          <Route path="/result/:id" element={<Result />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Record/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry Retrieval/i })).toBeInTheDocument();
  });
});
