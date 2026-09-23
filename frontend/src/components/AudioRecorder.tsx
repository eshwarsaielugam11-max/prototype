import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, RotateCcw, Activity, AlertCircle, Sparkles, CheckCircle2, ShieldAlert, Volume2 } from 'lucide-react';
import { predict, ApiError, PredictResponse } from '../api/client';

interface AudioRecorderProps {
  onPredictionSuccess?: (result: PredictResponse) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onPredictionSuccess }) => {
  const navigate = useNavigate();

  // Recording & stream state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [testId, setTestId] = useState<string>('');
  
  // UI & Network state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState<boolean>(false);

  // Audio Context & MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up object URLs and audio contexts on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Live Canvas Waveform Drawing Loop
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      // Deep dark canvas background
      ctx.fillStyle = '#06070C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid center hairline
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#222638';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Waveform line in luminous signal-gold
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#D9A55C';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalized [0, 2]
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  }, []);

  // Request Microphone and Start Recording
  const startRecording = async () => {
    setError(null);
    setMicDenied(false);
    audioChunksRef.current = [];

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = selectedMimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      drawWaveform();
    } catch (err: unknown) {
      console.error('Microphone access failed:', err);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setMicDenied(true);
        setError('Microphone permission was denied by your browser. Please allow microphone access in your browser settings to record voice.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone device found on your system. Please connect an audio input device.');
      } else {
        setError(`Unable to access microphone: ${err instanceof Error ? err.message : 'Unknown audio error'}`);
      }
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Reset / Re-record
  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  };

  // Submit to Backend API
  const handleAnalyze = async () => {
    if (!audioBlob) {
      setError('No audio recording available for analysis.');
      return;
    }

    if (duration < 1) {
      setError('Recording is too short (< 1.0s). Please record at least 3 to 5 seconds of sustained vowel phonation (/a/).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await predict(audioBlob, testId, 'recording');
      if (onPredictionSuccess) {
        onPredictionSuccess(result);
      } else {
        navigate(`/result/${result.test_record_id}`);
      }
    } catch (err: unknown) {
      console.error('Acoustic screening prediction error:', err);
      if (err instanceof ApiError) {
        setError(`Screening API Error (${err.status}): ${err.detail}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reach the screening backend service. Ensure server is running at http://localhost:8000.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-bg-panel rounded-lg border border-bg-panel-border shadow-panel p-6 sm:p-8">
      {/* Optional Patient / Reference Identifier */}
      <div className="mb-6 max-w-md">
        <label htmlFor="test-id" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 font-body">
          Patient / Session Reference ID <span className="text-ink-faint font-normal">(Optional)</span>
        </label>
        <input
          id="test-id"
          type="text"
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          placeholder="e.g. PT-2026-0814 or Clinician-Ref"
          disabled={isRecording || isAnalyzing}
          className="w-full px-3.5 py-2 text-sm bg-bg-void border border-bg-panel-border rounded text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-signal-gold focus:border-transparent transition-all disabled:opacity-50 font-body"
        />
      </div>

      {/* Live Waveform & Status Screen */}
      <div className="relative rounded overflow-hidden bg-bg-void border border-bg-panel-border shadow-inner mb-6">
        {/* Canvas Display */}
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40 object-cover"
        />

        {/* Overlay Status Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-elevated/20 text-risk-elevated border border-risk-elevated/40 backdrop-blur-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-risk-elevated" />
              LIVE RECORDING
            </span>
          ) : audioBlob ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-low/20 text-risk-low border border-risk-low/40 backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-risk-low" />
              RECORDING READY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bg-panel/80 text-ink-muted border border-bg-panel-border backdrop-blur-md">
              <Volume2 className="w-3.5 h-3.5 text-signal-gold" />
              STANDBY
            </span>
          )}
        </div>

        {/* Duration Timer */}
        <div className="absolute top-3 right-3 font-mono text-sm font-bold text-ink bg-bg-panel/90 border border-bg-panel-border px-3 py-1 rounded backdrop-blur-md">
          {formatTimer(duration)}
        </div>

        {/* Guided Phonation Cue in Canvas Center */}
        {!isRecording && !audioBlob && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none text-center">
            <Mic className="w-7 h-7 text-signal-gold/60 mb-2" />
            <p className="text-sm font-medium text-ink font-body">
              Click &ldquo;Start Phonation Recording&rdquo; below and sustain the vowel /a/ (&ldquo;ahhh&rdquo;)
            </p>
            <p className="text-xs text-ink-muted mt-1 font-body">Recommended duration: 3 to 5 seconds</p>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="mb-6 p-4 rounded bg-risk-elevated/10 border border-risk-elevated/40 flex items-start gap-3 text-ink text-sm">
          <AlertCircle className="w-5 h-5 text-risk-elevated shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-risk-elevated">{micDenied ? 'Microphone Permission Blocked' : 'Recording / Validation Issue'}</p>
            <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Playback Preview Player (Once Recorded) */}
      {audioUrl && !isRecording && (
        <div className="mb-6 p-4 rounded bg-bg-void border border-bg-panel-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Volume2 className="w-4 h-4 text-signal-gold" />
              <span>Playback Verification ({duration}s captured)</span>
            </div>
            <button
              type="button"
              onClick={resetRecording}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-record Audio</span>
            </button>
          </div>
          <audio controls src={audioUrl} className="w-full h-10 mt-1 rounded focus:outline-none" />
        </div>
      )}

      {/* Primary Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {!isRecording && !audioBlob && (
          <button
            type="button"
            onClick={startRecording}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-sm font-semibold shadow-glow-gold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
          >
            <Mic className="w-4 h-4" />
            <span>Start Phonation Recording</span>
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded bg-risk-elevated hover:bg-red-600 text-white font-body text-sm font-semibold shadow-md transition-all active:scale-95 animate-pulse focus-visible:ring-2 focus-visible:ring-risk-elevated focus-visible:outline-none"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Recording ({duration}s)</span>
          </button>
        )}

        {audioBlob && !isRecording && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetRecording}
              disabled={isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-bg-panel-border text-ink-muted hover:text-ink hover:bg-bg-panel-elevated font-medium text-xs font-body transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard &amp; Re-record</span>
            </button>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || duration < 1}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-sm font-semibold shadow-glow-gold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-bg-void" />
                  <span>Analyzing Acoustic Biomarkers...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Acoustic ML Screening</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Near-Action Medical Safety Notice */}
      <div className="mt-6 pt-4 border-t border-bg-panel-border/60 flex items-start gap-2.5 text-xs text-ink-muted">
        <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-ink font-medium">Screening Advisory:</strong> Audio is analyzed in volatile memory and purged immediately post-inference. Screening results are strictly intended for research and decision support, not diagnostic certainty.
        </p>
      </div>
    </div>
  );
};
