import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Report } from './Report';
import * as client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getReport: vi.fn(),
    generateReport: vi.fn(),
  };
});

describe('Report Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No Report Selected" when no ID is present', () => {
    render(
      <MemoryRouter initialEntries={['/report']}>
        <Routes>
          <Route path="/report" element={<Report />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/No Report Selected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse Screening History/i })).toBeInTheDocument();
  });

  it('renders 404 ungenerated state with generate button when report does not exist yet', async () => {
    vi.mocked(client.getReport).mockRejectedValueOnce(
      new client.ApiError(404, 'Report not found')
    );

    render(
      <MemoryRouter initialEntries={['/report/rec-123']}>
        <Routes>
          <Route path="/report/:id" element={<Report />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Clinical Report Not Yet Generated/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /Synthesize Clinical Report Now/i })
    ).toBeInTheDocument();
  });

  it('renders the complete four-part clinical report', async () => {
    const mockReport: client.Report = {
      model_prediction: {
        prediction: 'parkinsons_risk_indicated',
        probability: 0.782,
        threshold_used: 0.5,
      },
      retrieved_evidence: [
        {
          text: 'Vocal acoustic changes often present as reduced pitch range and dysphonia in early stages.',
          source_name: 'Movement Disorders Clinical Journal 2021',
          source_url: 'https://doi.org/10.1002/mds.28000',
          similarity_score: 0.88,
        },
      ],
      generated_explanation: {
        screening_summary: 'Screening indicates elevated vocal biomarkers associated with Parkinsonian hypophonia.',
        explanation: 'The self-supervised acoustic embeddings revealed jitter and fundamental frequency fluctuations.',
      },
      clinical_disclaimer: 'This is a research screening tool. It does not diagnose Parkinson\'s disease.',
    };

    vi.mocked(client.getReport).mockResolvedValueOnce(mockReport);

    render(
      <MemoryRouter initialEntries={['/report/rec-123']}>
        <Routes>
          <Route path="/report/:id" element={<Report />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Model Acoustic Prediction/i)).toBeInTheDocument();
    });

    // Section 1
    expect(screen.getByText(/78.2%/i)).toBeInTheDocument();
    expect(screen.getByText(/50.0%/i)).toBeInTheDocument();

    // Section 2
    expect(screen.getByText(/2\. Retrieved Authoritative Evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Movement Disorders Clinical Journal 2021/i)).toBeInTheDocument();
    expect(screen.getByText(/Vocal acoustic changes often present as reduced pitch range/i)).toBeInTheDocument();

    // Section 3
    expect(screen.getByText(/3\. AI-Generated Clinical Synthesis/i)).toBeInTheDocument();
    expect(screen.getByText(/Screening indicates elevated vocal biomarkers/i)).toBeInTheDocument();

    // Section 4
    expect(screen.getByText(/4\. Mandatory Clinical & Research Disclaimer/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a research screening tool\. It does not diagnose Parkinson's disease\./i)).toBeInTheDocument();
  });

  it('allows copying full report to clipboard', async () => {
    const mockReport: client.Report = {
      model_prediction: {
        prediction: 'low_risk_indicated',
        probability: 0.22,
        threshold_used: 0.5,
      },
      retrieved_evidence: [],
      generated_explanation: {
        screening_summary: 'Voice characteristics are within standard non-pathological baseline limits.',
        explanation: 'Harmonic consistency and amplitude stability were sustained throughout phonation.',
      },
      clinical_disclaimer: 'Medical Disclaimer: Research tool only.',
    };

    vi.mocked(client.getReport).mockResolvedValueOnce(mockReport);
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MemoryRouter initialEntries={['/report/rec-999']}>
        <Routes>
          <Route path="/report/:id" element={<Report />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Model Acoustic Prediction/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getAllByRole('button', { name: /Copy/i })[0];
    await userEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
  });
});
