import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileAudio, X, AlertCircle, Sparkles, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { predict, ApiError, PredictResponse } from '../api/client';

const ALLOWED_EXTENSIONS = ['wav', 'flac', 'ogg', 'mp3'];
const MAX_UPLOAD_MB = 25;
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

interface UploadDropzoneProps {
  onPredictionSuccess?: (result: PredictResponse) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onPredictionSuccess }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [testId, setTestId] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URLs on change/unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported audio format ".${ext}". Permitted formats: ${ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`);
      return;
    }

    if (selectedFile.size > MAX_BYTES) {
      setError(`File exceeds maximum upload limit of ${MAX_UPLOAD_MB}MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB detected).`);
      return;
    }

    if (selectedFile.size === 0) {
      setError('Selected audio file is empty (0 bytes). Please select a valid recording.');
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(selectedFile);
    setAudioUrl(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select or drop an audio file first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await predict(file, testId, 'upload');
      if (onPredictionSuccess) {
        onPredictionSuccess(result);
      } else {
        navigate(`/result/${result.test_record_id}`);
      }
    } catch (err: unknown) {
      console.error('Upload prediction error:', err);
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
      {/* Optional Patient / Session Identifier */}
      <div className="mb-6 max-w-md">
        <label htmlFor="upload-test-id" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Patient / Session Reference ID <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input
          id="upload-test-id"
          type="text"
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          placeholder="e.g. CLINICAL-SAMPLE-2026 or Anon-Subject"
          disabled={isAnalyzing}
          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
        />
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.ogg,.flac,audio/wav,audio/mpeg,audio/ogg,audio/flac"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Zone / Selected File View */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Drag and drop speech recording here
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            or click to browse your local file system
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
            {ALLOWED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-white text-slate-600 border border-slate-200 shadow-xs"
              >
                .{ext.toUpperCase()}
              </span>
            ))}
            <span className="text-[11px] text-slate-400 ml-1">Up to {MAX_UPLOAD_MB}MB</span>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validated Format
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={removeFile}
              disabled={isAnalyzing}
              aria-label="Remove audio file"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Player Preview */}
          {audioUrl && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-[11px] font-medium text-slate-600 mb-1">Audio Playback Preview:</p>
              <audio controls src={audioUrl} className="w-full h-9 rounded focus:outline-none" />
            </div>
          )}
        </div>
      )}

      {/* Error Alert Display */}
      {error && (
        <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Audio Validation / API Error</p>
            <p className="text-xs text-red-800 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Primary Action Controls */}
      {file && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={removeFile}
            disabled={isAnalyzing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Choose Different File
          </button>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isAnalyzing ? (
              <>
                <Activity className="w-4 h-4 animate-spin text-white" />
                <span>Processing Neural Screening...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upload &amp; Analyze Biomarkers</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Near-Action Medical Safety Notice */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Clinical Notice:</strong> Uploaded audio is processed in memory for neural inference and time-aligned attention mapping.
          Audio bytes are never permanently stored.
        </span>
      </div>
    </div>
  );
};
