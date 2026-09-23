import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UploadDropzone } from './UploadDropzone';
import * as clientApi from '../api/client';

describe('UploadDropzone Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-audio-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders drag-and-drop zone with supported formats', () => {
    render(
      <BrowserRouter>
        <UploadDropzone />
      </BrowserRouter>
    );

    expect(screen.getByText(/Drag and drop speech recording here/i)).toBeInTheDocument();
    expect(screen.getByText(/\.WAV/i)).toBeInTheDocument();
    expect(screen.getByText(/\.FLAC/i)).toBeInTheDocument();
    expect(screen.getByText(/Up to 25MB/i)).toBeInTheDocument();
  });

  it('rejects unsupported file extension with descriptive error', async () => {
    render(
      <BrowserRouter>
        <UploadDropzone />
      </BrowserRouter>
    );

    const file = new File(['dummy executable content'], 'malware.exe', { type: 'application/octet-stream' });
    const dropzone = screen.getByText(/Drag and drop speech recording here/i).closest('div');
    expect(dropzone).not.toBeNull();

    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported audio format "\.exe"/i)).toBeInTheDocument();
      expect(screen.getByText(/Audio Validation \/ API Error/i)).toBeInTheDocument();
    });
  });

  it('rejects oversized audio file exceeding 25MB', async () => {
    render(
      <BrowserRouter>
        <UploadDropzone />
      </BrowserRouter>
    );

    // Create a 26 MB dummy file
    const oversizedFile = new File([new ArrayBuffer(26 * 1024 * 1024)], 'large_voice.wav', { type: 'audio/wav' });
    const dropzone = screen.getByText(/Drag and drop speech recording here/i).closest('div');

    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [oversizedFile] },
    });

    await waitFor(() => {
      expect(screen.getByText(/exceeds maximum upload limit of 25MB/i)).toBeInTheDocument();
    });
  });

  it('accepts valid WAV audio file and shows preview with analyze button', async () => {
    const validFile = new File(['valid wav audio header'], 'sample_patient.wav', { type: 'audio/wav' });

    render(
      <BrowserRouter>
        <UploadDropzone />
      </BrowserRouter>
    );

    const dropzone = screen.getByText(/Drag and drop speech recording here/i).closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [validFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('sample_patient.wav')).toBeInTheDocument();
      expect(screen.getByText(/Validated Format/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upload & Analyze Biomarkers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Choose Different File/i })).toBeInTheDocument();
    });
  });

  it('triggers predict API call and handles success callback', async () => {
    const validFile = new File(['audio'], 'sample.wav', { type: 'audio/wav' });
    const mockPrediction = {
      test_record_id: 'rec-1234',
      prediction: 'low_risk_indicated' as const,
      probability: 0.15,
      threshold_used: 0.55,
      attention: { timestamps_sec: [0.0], attention: [0.1] },
    };

    const predictSpy = vi.spyOn(clientApi, 'predict').mockResolvedValue(mockPrediction);
    const onSuccessMock = vi.fn();

    render(
      <BrowserRouter>
        <UploadDropzone onPredictionSuccess={onSuccessMock} />
      </BrowserRouter>
    );

    const dropzone = screen.getByText(/Drag and drop speech recording here/i).closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [validFile] },
    });

    const analyzeBtn = await screen.findByRole('button', { name: /Upload & Analyze Biomarkers/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(predictSpy).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).toHaveBeenCalledWith(mockPrediction);
    });
  });
});
