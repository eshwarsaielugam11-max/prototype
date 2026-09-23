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

      // Background
      ctx.fillStyle = '#0f172a'; // Navy Slate
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid line (center)
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Waveform line
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#38bdf8'; // Sky Blue
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

    // Revoke existing URL if any
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

      // Audio Analyser Setup
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder Setup with optimal mimeType
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

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // 100ms chunk intervals
      setIsRecording(true);

      // Start duration counter
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      // Start live canvas rendering
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
      {/* Optional Patient / Reference Identifier */}
      <div className="mb-6 max-w-md">
        <label htmlFor="test-id" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Patient / Session Reference ID <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input
          id="test-id"
          type="text"
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          placeholder="e.g. PT-2026-0814 or Clinician-Ref"
          disabled={isRecording || isAnalyzing}
          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
        />
      </div>

      {/* Live Waveform & Status Screen */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner mb-6">
        {/* Canvas Display */}
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40 object-cover"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              LIVE RECORDING
            </span>
          ) : audioBlob ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              RECORDING READY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              STANDBY
            </span>
          )}
        </div>

        {/* Duration Timer */}
        <div className="absolute top-3 right-3 font-mono text-base font-bold text-white bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-md backdrop-blur-sm">
          {formatTimer(duration)}
        </div>

        {/* Guided Phonation Cue in Canvas Center */}
        {!isRecording && !audioBlob && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none text-center">
            <Mic className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">
              Click &ldquo;Start Recording&rdquo; below and sustain the vowel /a/ (&ldquo;ahhh&rdquo;)
            </p>
            <p className="text-xs text-slate-500 mt-1">Recommended duration: 3 to 5 seconds</p>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{micDenied ? 'Microphone Permission Blocked' : 'Recording / Validation Issue'}</p>
            <p className="text-xs text-red-800 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Playback Preview Player (Once Recorded) */}
      {audioUrl && !isRecording && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span>Playback Verification ({duration}s captured)</span>
            </div>
            <button
              onClick={resetRecording}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record Audio
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Mic className="w-5 h-5" />
            Start Phonation Recording
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-transform active:scale-95 animate-pulse focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop Recording ({duration}s)
          </button>
        )}

        {audioBlob && !isRecording && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetRecording}
              disabled={isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Discard &amp; Re-record
            </button>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || duration < 1}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-white" />
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
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Clinical Notice:</strong> Audio features are computed in real time by WavLM acoustic encoders.
          Acoustic screening provides decision support probability only and is not a clinical diagnosis.
        </span>
      </div>
    </div>
  );
};
