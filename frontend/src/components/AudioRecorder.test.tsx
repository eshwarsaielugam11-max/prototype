import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AudioRecorder } from './AudioRecorder';
import * as clientApi from '../api/client';

describe('AudioRecorder Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock AudioContext & AnalyserNode
    const mockAnalyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn(),
    };
    const mockAudioContext = {
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
    };

    window.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);

    // Mock HTMLCanvasElement getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    });
  });

  it('renders initial standby state with Start Phonation Recording button', () => {
    render(
      <BrowserRouter>
        <AudioRecorder />
      </BrowserRouter>
    );

    expect(screen.getByText(/Start Phonation Recording/i)).toBeInTheDocument();
    expect(screen.getByText(/STANDBY/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient \/ Session Reference ID/i)).toBeInTheDocument();
  });

  it('displays clear error when microphone access is denied by browser', async () => {
    // Mock getUserMedia rejection
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    render(
      <BrowserRouter>
        <AudioRecorder />
      </BrowserRouter>
    );

    const startBtn = screen.getByRole('button', { name: /Start Phonation Recording/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Microphone Permission Blocked/i)).toBeInTheDocument();
      expect(screen.getByText(/allow microphone access in your browser settings/i)).toBeInTheDocument();
    });
  });

  it('handles recording start and stop state transitions', async () => {
    // Mock MediaStream and MediaRecorder
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    };
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    let ondataavailableHandler: ((e: any) => void) | null = null;
    let onstopHandler: (() => void) | null = null;

    class MockMediaRecorder {
      static isTypeSupported = vi.fn().mockReturnValue(true);
      state = 'inactive';
      start = vi.fn(() => { this.state = 'recording'; });
      stop = vi.fn(() => {
        this.state = 'inactive';
        if (ondataavailableHandler) {
          ondataavailableHandler({ data: new Blob(['audio-data'], { type: 'audio/webm' }) });
        }
        if (onstopHandler) onstopHandler();
      });
      set ondataavailable(handler: any) { ondataavailableHandler = handler; }
      set onstop(handler: any) { onstopHandler = handler; }
    }

    (window as any).MediaRecorder = MockMediaRecorder;

    render(
      <BrowserRouter>
        <AudioRecorder />
      </BrowserRouter>
    );

    const startBtn = screen.getByRole('button', { name: /Start Phonation Recording/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/LIVE RECORDING/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop Recording/i })).toBeInTheDocument();
    });

    // Click stop
    const stopBtn = screen.getByRole('button', { name: /Stop Recording/i });
    fireEvent.click(stopBtn);

    await waitFor(() => {
      expect(screen.getByText(/RECORDING READY/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Discard & Re-record/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Run Acoustic ML Screening/i })).toBeInTheDocument();
    });
  });
});
