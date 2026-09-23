import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { History } from './History';
import * as client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listHistory: vi.fn(),
  };
});

describe('History Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading indicator and then history items', async () => {
    const mockItems: client.TestRecordListItem[] = [
      {
        id: 'rec-001',
        test_id: 'PATIENT-A',
        source: 'recording',
        prediction: 'parkinsons_risk_indicated',
        probability: 0.82,
        threshold_used: 0.5,
        audio_duration_sec: 5.0,
        model_version: 'wav2vec2-v1',
        has_report: true,
        created_at: '2026-03-20T12:00:00Z',
      },
      {
        id: 'rec-002',
        test_id: null,
        source: 'upload',
        prediction: 'low_risk_indicated',
        probability: 0.15,
        threshold_used: 0.5,
        audio_duration_sec: 3.2,
        model_version: 'wav2vec2-v1',
        has_report: false,
        created_at: '2026-03-19T09:30:00Z',
      },
    ];

    vi.mocked(client.listHistory).mockResolvedValueOnce(mockItems);

    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<History />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading Screening Records\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PATIENT-A')).toBeInTheDocument();
    });

    expect(screen.getByText('82.0%')).toBeInTheDocument();
    expect(screen.getByText('Risk Indicated')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();

    // Verify Inspect and Report links
    const inspectLinks = screen.getAllByRole('link', { name: /Inspect/i });
    expect(inspectLinks.length).toBe(2);
    expect(inspectLinks[0]).toHaveAttribute('href', '/result/rec-001');
    expect(inspectLinks[1]).toHaveAttribute('href', '/result/rec-002');

    const reportLinks = screen.getAllByRole('link', { name: /Ready/i });
    expect(reportLinks.length).toBe(1);
    expect(reportLinks[0]).toHaveAttribute('href', '/report/rec-001');
  });

  it('filters items by search query', async () => {
    const mockItems: client.TestRecordListItem[] = [
      {
        id: 'rec-001',
        test_id: 'PATIENT-ALPHA',
        source: 'recording',
        prediction: 'parkinsons_risk_indicated',
        probability: 0.82,
        threshold_used: 0.5,
        audio_duration_sec: 5.0,
        model_version: 'wav2vec2-v1',
        has_report: true,
        created_at: '2026-03-20T12:00:00Z',
      },
      {
        id: 'rec-002',
        test_id: 'PATIENT-BETA',
        source: 'upload',
        prediction: 'low_risk_indicated',
        probability: 0.15,
        threshold_used: 0.5,
        audio_duration_sec: 3.2,
        model_version: 'wav2vec2-v1',
        has_report: false,
        created_at: '2026-03-19T09:30:00Z',
      },
    ];

    vi.mocked(client.listHistory).mockResolvedValueOnce(mockItems);

    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<History />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PATIENT-ALPHA')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by Patient ID/i);
    await userEvent.type(searchInput, 'BETA');

    expect(screen.queryByText('PATIENT-ALPHA')).not.toBeInTheDocument();
    expect(screen.getByText('PATIENT-BETA')).toBeInTheDocument();
  });

  it('renders empty state when no history records are found', async () => {
    vi.mocked(client.listHistory).mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<History />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No screenings yet.')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Start Live Record/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upload Audio File/i })).toBeInTheDocument();
  });

  it('renders error state when backend is unreachable', async () => {
    vi.mocked(client.listHistory).mockRejectedValueOnce(
      new client.ApiError(500, 'Internal server error connecting to database')
    );

    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<History />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to Query Screening Repository/i)).toBeInTheDocument();
      expect(screen.getByText(/API Error \(500\)/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Retry query/i })).toBeInTheDocument();
  });
});
