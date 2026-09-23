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
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-10 shadow-panel text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-bg-void text-signal-gold flex items-center justify-center mx-auto mb-4 border border-bg-panel-border">
            <AudioWaveform className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-display font-medium text-ink mb-2">No Screening Record Selected</h2>
          <p className="text-sm text-ink-muted mb-6 font-body leading-relaxed">
            Please perform a live microphone phonation recording or upload an audio file to evaluate acoustic risk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/record"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body shadow-glow-gold transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>Live Record</span>
            </Link>
            <Link
              to="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-bg-panel-elevated hover:bg-bg-panel-border text-ink font-medium text-xs font-body border border-bg-panel-border transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-ink-muted" />
              <span>Upload Audio</span>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Loading Screening Record...">
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-12 shadow-panel text-center max-w-lg mx-auto">
          <Activity className="w-8 h-8 text-signal-gold animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink font-body">Retrieving Acoustic Screening Record</p>
          <p className="text-xs text-ink-muted mt-1 font-mono">{id}</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !record) {
    return (
      <PageContainer title="Screening Record Error">
        <div className="bg-bg-panel rounded-lg border border-risk-elevated/40 p-8 shadow-panel max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-risk-elevated/15 text-risk-elevated flex items-center justify-center mx-auto mb-3 border border-risk-elevated/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-display font-medium text-ink mb-2">Unable to Load Record</h2>
          <p className="text-xs text-ink-muted bg-bg-void p-3 rounded border border-bg-panel-border mb-6 text-left font-mono">
            {error || 'Record data is empty.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fetchRecord(id)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Retrieval</span>
            </button>
            <Link
              to="/history"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-bg-panel-elevated hover:bg-bg-panel-border text-ink font-medium text-xs font-body border border-bg-panel-border transition-colors"
            >
              <History className="w-4 h-4" />
              <span>View History</span>
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
      title="Acoustic Screening Result"
      subtitle={`Session ID: ${record.id} • Analyzed on ${new Date(record.created_at).toLocaleString()}`}
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            to="/record"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-signal-gold" />
            <span>New Recording</span>
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Primary Prediction Outcome Card (Flat bg-panel, hairline border, explicit text + color pairing) */}
        <div
          className={`rounded-lg border p-6 sm:p-8 shadow-panel transition-all ${
            isElevatedRisk
              ? 'bg-bg-panel border-risk-elevated/40'
              : 'bg-bg-panel border-risk-low/40'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Outcome Title & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isElevatedRisk ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold bg-risk-elevated/15 text-risk-elevated border border-risk-elevated/40">
                    <span className="w-2 h-2 rounded-full bg-risk-elevated animate-pulse" />
                    ELEVATED ACOUSTIC RISK INDICATED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold bg-risk-low/15 text-risk-low border border-risk-low/40">
                    <span className="w-2 h-2 rounded-full bg-risk-low" />
                    LOW ACOUSTIC RISK INDICATED
                  </span>
                )}
                <span className="text-xs font-mono text-ink-faint uppercase px-2 py-0.5 rounded bg-bg-void border border-bg-panel-border">
                  {record.source}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink tracking-tight">
                {isElevatedRisk
                  ? "Voice Pattern Shows Parkinson's-Risk Indicators"
                  : "Voice Pattern Consistent with Lower Parkinson's-Risk Indicators"}
              </h2>

              <p className="text-xs sm:text-sm text-ink-muted font-body leading-relaxed max-w-2xl font-normal">
                {isElevatedRisk
                  ? "The neural network detected acoustic feature perturbations (such as fundamental frequency fluctuations and hypophonic variance) characteristic of elevated risk."
                  : "The neural network detected stable harmonic ratios, steady fundamental frequency, and vocal loudness consistent with normal baseline ranges."}
              </p>
            </div>

            {/* Probability Score Pill */}
            <div className="flex flex-col items-center justify-center p-5 rounded bg-bg-void border border-bg-panel-border shadow-inner shrink-0 min-w-[210px]">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1 font-body">
                Risk Probability Score
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${
                    isElevatedRisk ? 'text-risk-elevated' : 'text-risk-low'
                  }`}
                >
                  {probPercent}%
                </span>
              </div>
              <div className="mt-2 w-full bg-bg-panel rounded-full h-1.5 overflow-hidden border border-bg-panel-border">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isElevatedRisk ? 'bg-risk-elevated' : 'bg-risk-low'
                  }`}
                  style={{ width: `${probPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-ink-muted mt-1.5 font-mono">
                Decision Threshold: {threshPercent}%
              </span>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="mt-6 pt-5 border-t border-bg-panel-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-body">
            <div>
              <span className="text-ink-faint block text-[11px]">Patient / Test Ref:</span>
              <span className="font-medium text-ink flex items-center gap-1 mt-0.5 font-mono">
                <User className="w-3.5 h-3.5 text-signal-gold" />
                {record.test_id || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-ink-faint block text-[11px]">Audio Duration:</span>
              <span className="font-medium text-ink font-mono mt-0.5 block">
                {record.audio_duration_sec.toFixed(2)} seconds
              </span>
            </div>
            <div>
              <span className="text-ink-faint block text-[11px]">Model Checkpoint:</span>
              <span className="font-medium text-ink font-mono mt-0.5 block truncate">
                {record.model_version}
              </span>
            </div>
            <div>
              <span className="text-ink-faint block text-[11px]">Screening Date:</span>
              <span className="font-medium text-ink flex items-center gap-1 mt-0.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-signal-blue" />
                {new Date(record.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Explainability Meaning Callout */}
        <div className="p-4 rounded bg-bg-panel border border-signal-blue/30 text-xs text-ink-muted flex items-start gap-3 font-body">
          <Info className="w-4 h-4 text-signal-blue shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-ink font-medium">Understanding This Metric:</strong> The probability score reflects the neural model&rsquo;s statistical confidence based on acoustic self-supervised feature embeddings. It is <strong>a learned-pattern signal, not medical certainty or a formal clinical diagnosis</strong>.
          </p>
        </div>

        {/* Time-Aligned Attention Rollout Heatmap with Signal-Gold Intensity */}
        <AttentionHeatmap
          attentionData={attentionData}
          audioDurationSec={record.audio_duration_sec}
        />

        {/* Report Generation Action Card */}
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border shadow-panel p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-5 h-5 text-signal-gold" />
                <h3 className="text-lg font-display font-medium text-ink">
                  Comprehensive Clinical Decision Support Report
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted max-w-2xl leading-relaxed font-body">
                Synthesize this acoustic screening outcome with retrieved medical literature citations (hypophonia, pitch variance, acoustic biomarkers) and safety-reviewed narrative explanations.
              </p>
            </div>

            <div className="shrink-0">
              {record.has_report ? (
                <Link
                  to={`/report/${record.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded bg-risk-low hover:bg-emerald-600 text-bg-void font-semibold text-xs font-body shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Synthesized Report</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body shadow-glow-gold transition-all active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
                >
                  {isGeneratingReport ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-bg-void" />
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

          {/* Report Generation Error Alert (503 LLM Unavailable Guidance) */}
          {reportError && (
            <div className="mt-5 p-4 rounded bg-risk-caution/10 border border-risk-caution/30 text-ink text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-risk-caution shrink-0 mt-0.5" />
              <div className="space-y-1 font-body">
                <p className="font-semibold text-sm text-risk-caution">Report Synthesis Advisory</p>
                <p className="leading-relaxed text-ink-muted">{reportError}</p>
                <p className="text-[11px] text-ink-faint pt-1">
                  Tip: A free LLM API key can be obtained instantly from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline text-signal-gold">Groq Console</a> or <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline text-signal-gold">Google AI Studio</a>. Set <code className="font-mono bg-bg-void px-1 py-0.5 rounded text-signal-gold border border-bg-panel-border">LLM_API_KEY</code> in <code className="font-mono bg-bg-void px-1 py-0.5 rounded text-signal-gold border border-bg-panel-border">.env</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Non-Dismissible Bottom Disclaimer */}
        <div className="p-4 rounded bg-bg-panel/60 border border-bg-panel-border text-xs text-ink-muted flex items-start gap-2.5 font-body">
          <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-ink font-medium">Medical Notice:</strong> This acoustic screening evaluation is strictly intended as a Clinical Decision Support research tool. It cannot confirm or rule out the presence of Parkinson&rsquo;s disease. A formal neurological evaluation is required for diagnosis.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
