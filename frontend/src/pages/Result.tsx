import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import { AttentionHeatmap } from '../components/AttentionHeatmap';
import {
  getHistoryItem,
  generateReport,
  TestRecordResponse,
  AttentionHeatmapData,
  ApiError,
} from '../api/client';
import {
  Activity,
  AlertTriangle,
  FileText,
  Mic,
  UploadCloud,
  History,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  Calendar,
  User,
  AudioWaveform,
} from 'lucide-react';

export const Result: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<TestRecordResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Report generation state
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const fetchRecord = async (recordId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistoryItem(recordId);
      setRecord(data);
    } catch (err: unknown) {
      console.error('Failed to load screening record:', err);
      if (err instanceof ApiError) {
        setError(
          err.status === 404
            ? `Screening record ID "${recordId}" was not found in the local repository.`
            : `API Error (${err.status}): ${err.detail}`
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to connect to the backend service at http://localhost:8000.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRecord(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  // Handle Generate / View Report
  const handleGenerateReport = async () => {
    if (!id) return;
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      await generateReport(id);
      navigate(`/report/${id}`);
    } catch (err: unknown) {
      console.error('Failed to generate report:', err);
      if (err instanceof ApiError) {
        setReportError(err.detail);
      } else if (err instanceof Error) {
        setReportError(err.message);
      } else {
        setReportError('Failed to generate report. Please verify LLM configuration.');
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Safe parse of attention heatmap JSON
  const attentionData: AttentionHeatmapData | null = React.useMemo(() => {
    if (!record?.attention_heatmap_json) return null;
    try {
      return JSON.parse(record.attention_heatmap_json) as AttentionHeatmapData;
    } catch (e) {
      console.error('Failed to parse attention heatmap JSON:', e);
      return null;
    }
  }, [record]);

  if (!id) {
    return (
      <PageContainer
        title="Screening Results"
        subtitle="Inspect acoustic neural predictions and time-aligned attention rollout."
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-card text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <AudioWaveform className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No Screening Record Selected</h2>
          <p className="text-sm text-slate-600 mb-6">
            Please perform a live microphone phonation recording or upload an audio file to evaluate acoustic risk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/record"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <Mic className="w-4 h-4" />
              Live Record
            </Link>
            <Link
              to="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Audio
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Loading Screening Record...">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-card text-center max-w-lg mx-auto">
          <Activity className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Retrieving Acoustic Screening Record</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{id}</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !record) {
    return (
      <PageContainer title="Screening Record Error">
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-card max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Record</h2>
          <p className="text-xs text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 mb-6 text-left font-mono">
            {error || 'Record data is empty.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fetchRecord(id)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Retrieval
            </button>
            <Link
              to="/history"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
            >
              <History className="w-4 h-4" />
              View History
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Derive outcome presentation
  const isElevatedRisk = record.prediction === 'parkinsons_risk_indicated';
  const probPercent = (record.probability * 100).toFixed(1);
  const threshPercent = (record.threshold_used * 100).toFixed(1);

  return (
    <PageContainer
      title="Acoustic Screening Result &amp; Explainability"
      subtitle={`Session ID: ${record.id} • Analyzed on ${new Date(record.created_at).toLocaleString()}`}
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            to="/record"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <Mic className="w-3.5 h-3.5" />
            New Recording
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <History className="w-3.5 h-3.5" />
            History
          </Link>
        </div>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Primary Prediction Outcome Card */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 shadow-card transition-all ${
            isElevatedRisk
              ? 'bg-gradient-to-br from-red-50/70 via-white to-white border-red-200'
              : 'bg-gradient-to-br from-emerald-50/70 via-white to-white border-emerald-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Outcome Title & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isElevatedRisk ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    ELEVATED ACOUSTIC RISK INDICATED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    LOW ACOUSTIC RISK INDICATED
                  </span>
                )}
                <span className="text-xs font-mono text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {record.source}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isElevatedRisk
                  ? "Voice Pattern Shows Parkinson's-Risk Indicators"
                  : "Voice Pattern Consistent with Lower Parkinson's-Risk Indicators"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                {isElevatedRisk
                  ? "The neural network detected acoustic feature perturbations (such as fundamental frequency fluctuations and hypophonic variance) characteristic of elevated risk."
                  : "The neural network detected stable harmonic ratios, steady fundamental frequency, and vocal loudness consistent with normal baseline ranges."}
              </p>
            </div>

            {/* Probability Score Pill / Callout */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0 min-w-[200px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Risk Probability Score
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-mono ${
                    isElevatedRisk ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {probPercent}%
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isElevatedRisk ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${probPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 font-mono">
                Threshold: {threshPercent}%
              </span>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Patient / Test Ref:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {record.test_id || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Audio Duration:</span>
              <span className="font-semibold text-slate-800 font-mono mt-0.5 block">
                {record.audio_duration_sec.toFixed(2)} seconds
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Model Checkpoint:</span>
              <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate">
                {record.model_version}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Screening Date:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(record.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Explainability Callout */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Understanding This Score:</strong> The probability score reflects the neural model&rsquo;s statistical confidence based on acoustic self-supervised feature embeddings. It is <strong>not a medical certainty or a formal clinical diagnosis</strong>.
          </p>
        </div>

        {/* Time-Aligned Attention Rollout Heatmap */}
        <AttentionHeatmap
          attentionData={attentionData}
          audioDurationSec={record.audio_duration_sec}
        />

        {/* Report Generation Action Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Comprehensive Clinical Decision Support Report
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Synthesize this acoustic screening outcome with retrieved medical literature citations (hypophonia, pitch variance, acoustic biomarkers) and safety-reviewed narrative explanations.
              </p>
            </div>

            <div className="shrink-0">
              {record.has_report ? (
                <Link
                  to={`/report/${record.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  View Synthesized Report
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isGeneratingReport ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Clinical Report...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Full Decision Support Report</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Report Generation Error Alert (Handles 503 LLM Unavailable Gracefully) */}
          {reportError && (
            <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-amber-900">Report Synthesis Advisory</p>
                <p className="leading-relaxed">{reportError}</p>
                <p className="text-[11px] text-amber-800 pt-1">
                  Tip: A free LLM API key can be obtained instantly from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Groq Console</a> or <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google AI Studio</a>. Set <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">LLM_API_KEY</code> in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Non-Dismissible Bottom Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Medical Notice:</strong> This acoustic screening evaluation is strictly intended as a Clinical Decision Support research tool. It cannot confirm or rule out the presence of Parkinson&rsquo;s disease. A formal neurological evaluation is required for diagnosis.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
