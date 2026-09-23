import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import { ReportSection } from '../components/ReportSection';
import {
  getReport,
  generateReport,
  Report as ReportContract,
  ApiError,
} from '../api/client';
import {
  Activity,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  FileText,
  ExternalLink,
  BookOpen,
  Cpu,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  Mic,
  CheckCircle2,
} from 'lucide-react';

export const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [report, setReport] = useState<ReportContract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [is404NotGenerated, setIs404NotGenerated] = useState<boolean>(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchReportData = async (recordId: string) => {
    setLoading(true);
    setError(null);
    setIs404NotGenerated(false);

    try {
      const data = await getReport(recordId);
      setReport(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setIs404NotGenerated(true);
      } else {
        console.error('Failed to load report:', err);
        const msg = err instanceof ApiError ? `API Error (${err.status}): ${err.detail}` : (err instanceof Error ? err.message : 'Failed to retrieve report.');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReportData(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleGenerateNow = async () => {
    if (!id) return;
    setIsGenerating(true);
    setGenError(null);

    try {
      const generated = await generateReport(id);
      setReport(generated);
      setIs404NotGenerated(false);
    } catch (err: unknown) {
      console.error('Error generating report:', err);
      if (err instanceof ApiError) {
        setGenError(err.detail);
      } else if (err instanceof Error) {
        setGenError(err.message);
      } else {
        setGenError('Failed to generate clinical report. Ensure LLM service is available.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Full Report as Structured Text to Clipboard
  const handleCopyText = async () => {
    if (!report) return;

    const probPct = (report.model_prediction.probability * 100).toFixed(1);
    const threshPct = (report.model_prediction.threshold_used * 100).toFixed(1);

    const evidenceText = report.retrieved_evidence
      .map(
        (e, idx) =>
          `[Evidence ${idx + 1}] Source: ${e.source_name}${e.source_url ? ` (${e.source_url})` : ''}\n"${e.text}"`
      )
      .join('\n\n');

    const plainText = `PARKINSON'S DISEASE VOICE SCREENING PLATFORM
CLINICAL DECISION SUPPORT REPORT
Screening Record ID: ${id || 'N/A'}
Generated: ${new Date().toLocaleString()}
================================================================================

1. MODEL PREDICTION (Acoustic Neural Network - Untouched by LLM)
--------------------------------------------------------------------------------
- Screening Outcome: ${
      report.model_prediction.prediction === 'parkinsons_risk_indicated'
        ? "Parkinson's-Risk Indicators Detected"
        : 'Low Risk Indicated'
    }
- Calibrated Probability: ${probPct}%
- Operational Classification Threshold: ${threshPct}%

2. RETRIEVED REFERENCE INFORMATION (Authoritative Literature)
--------------------------------------------------------------------------------
${evidenceText || 'No external passages retrieved.'}

3. AI-GENERATED CLINICAL EXPLANATION (Grounded Synthesis)
--------------------------------------------------------------------------------
[Screening Summary]
${report.generated_explanation.screening_summary}

[Acoustic & Clinical Context]
${report.generated_explanation.explanation}

4. MANDATORY CLINICAL & RESEARCH DISCLAIMER
--------------------------------------------------------------------------------
${report.clinical_disclaimer}
================================================================================
`;

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!id) {
    return (
      <PageContainer
        title="Clinical Decision Support Report"
        subtitle="Grounded synthesis of acoustic neural findings and medical literature."
      >
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-10 shadow-panel text-center max-w-xl mx-auto">
          <FileText className="w-12 h-12 text-ink-muted mx-auto mb-3" />
          <h2 className="text-lg font-display font-medium text-ink mb-2">No Report Selected</h2>
          <p className="text-sm text-ink-muted mb-6 font-body leading-relaxed">
            Please perform a voice screening or select an existing session from history to view its clinical report.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-signal-gold text-bg-void font-semibold text-xs font-body shadow-glow-gold hover:bg-signal-gold-hover transition-all"
            >
              Browse Screening History
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Loading Decision Support Report...">
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-12 shadow-panel text-center max-w-lg mx-auto">
          <Activity className="w-8 h-8 text-signal-gold animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink font-body">Retrieving Clinical Report</p>
          <p className="text-xs text-ink-muted mt-1 font-mono">{id}</p>
        </div>
      </PageContainer>
    );
  }

  // 404: Report not yet synthesized for this test record
  if (is404NotGenerated) {
    return (
      <PageContainer
        title="Clinical Report Not Yet Generated"
        subtitle={`Screening Session ID: ${id}`}
        actions={
          <Link
            to={`/result/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Result</span>
          </Link>
        }
      >
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-8 sm:p-10 shadow-panel max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-signal-gold/15 text-signal-gold flex items-center justify-center mx-auto mb-4 border border-signal-gold/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-medium text-ink mb-2">
            Generate Decision Support Report
          </h2>
          <p className="text-sm text-ink-muted mb-6 leading-relaxed font-body">
            This screening session has an acoustic prediction on record, but the grounded literature synthesis has not yet been triggered.
          </p>

          <button
            type="button"
            onClick={handleGenerateNow}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body shadow-glow-gold transition-all active:scale-95 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Activity className="w-4 h-4 animate-spin text-bg-void" />
                <span>Retrieving Evidence &amp; Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Clinical Report Now</span>
              </>
            )}
          </button>

          {genError && (
            <div className="mt-6 p-4 rounded bg-risk-caution/10 border border-risk-caution/30 text-ink text-xs text-left flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-risk-caution shrink-0 mt-0.5" />
              <div className="font-body">
                <p className="font-semibold text-risk-caution mb-0.5">LLM Synthesis Unavailable</p>
                <p className="leading-relaxed text-ink-muted">{genError}</p>
                <p className="mt-1 text-ink-faint">
                  Configure <code className="font-mono bg-bg-void px-1 py-0.5 rounded text-signal-gold border border-bg-panel-border">LLM_API_KEY</code> in <code className="font-mono bg-bg-void px-1 py-0.5 rounded text-signal-gold border border-bg-panel-border">.env</code> to enable free hosted synthesis.
                </p>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  if (error || !report) {
    return (
      <PageContainer title="Report Retrieval Error">
        <div className="bg-bg-panel rounded-lg border border-risk-elevated/40 p-8 shadow-panel max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-risk-elevated/15 text-risk-elevated flex items-center justify-center mx-auto mb-3 border border-risk-elevated/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-display font-medium text-ink mb-2">Unable to Load Report</h2>
          <p className="text-xs text-ink-muted bg-bg-void p-3 rounded border border-bg-panel-border mb-6 text-left font-mono">
            {error || 'Unknown error occurred.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => fetchReportData(id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-signal-gold text-bg-void font-semibold text-xs font-body hover:bg-signal-gold-hover transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-bg-panel-elevated text-ink font-medium text-xs font-body border border-bg-panel-border hover:bg-bg-panel-border transition-colors"
            >
              <span>Back to History</span>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Formatting variables
  const isElevated = report.model_prediction.prediction === 'parkinsons_risk_indicated';
  const probFormatted = (report.model_prediction.probability * 100).toFixed(1);
  const threshFormatted = (report.model_prediction.threshold_used * 100).toFixed(1);

  return (
    <PageContainer
      title="Clinical Decision Support Report"
      subtitle={`Screening Session ID: ${id} • Synthesized on ${new Date().toLocaleDateString()}`}
      maxWidth="standard"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/result/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Screening Result</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-risk-low" />
                <span className="text-risk-low font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-signal-gold" />
                <span>Copy report as text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-signal-blue" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* Section 1: Model Prediction (Raw Neural Data - Untouched by LLM)         */}
        {/* ========================================================================= */}
        <ReportSection
          title="Model prediction"
          badge="Raw Neural Network Output"
          badgeVariant="blue"
          icon={Cpu}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Risk Classification */}
            <div className="p-4 rounded bg-bg-void border border-bg-panel-border">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block mb-1.5 font-body">
                Screening Classification
              </span>
              <div className="flex items-center gap-2 mt-1">
                {isElevated ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-elevated shrink-0" />
                    <span className="font-semibold text-sm text-risk-elevated font-body">
                      Parkinson&rsquo;s-Risk Indicators
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-low shrink-0" />
                    <span className="font-semibold text-sm text-risk-low font-body">
                      Low-Risk Indicated
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Probability Score */}
            <div className="p-4 rounded bg-bg-void border border-bg-panel-border">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block mb-1.5 font-body">
                Calibrated Probability
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-2xl font-bold font-mono ${
                    isElevated ? 'text-risk-elevated' : 'text-risk-low'
                  }`}
                >
                  {probFormatted}%
                </span>
                <span className="text-xs text-ink-muted font-body ml-1">acoustic risk score</span>
              </div>
            </div>

            {/* Decision Threshold */}
            <div className="p-4 rounded bg-bg-void border border-bg-panel-border">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block mb-1.5 font-body">
                Decision Threshold
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-ink">
                  {threshFormatted}%
                </span>
                <span className="text-xs text-ink-muted font-body ml-1">calibrated cutoff</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-ink-faint mt-3 italic font-body">
            * Values represent raw continuous probabilities from the self-supervised acoustic backbone without alteration.
          </p>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 2: Retrieved Reference Information (Curated Evidence)             */}
        {/* ========================================================================= */}
        <ReportSection
          title="Retrieved reference information"
          badge="Curated Medical Literature"
          badgeVariant="gold"
          icon={BookOpen}
        >
          <div className="space-y-3 pt-1">
            {report.retrieved_evidence.length > 0 ? (
              report.retrieved_evidence.map((chunk, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded bg-bg-void border border-bg-panel-border transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-signal-gold/15 text-signal-gold text-[11px] font-mono font-bold flex items-center justify-center shrink-0 border border-signal-gold/30">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-ink font-body">
                        {chunk.source_name}
                      </span>
                    </div>

                    {chunk.source_url && (
                      <a
                        href={chunk.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-blue hover:text-blue-400 hover:underline font-body"
                      >
                        <span>Citation Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <blockquote className="text-xs text-ink-muted leading-relaxed pl-3 border-l-2 border-signal-gold/40 italic font-body">
                    &ldquo;{chunk.text}&rdquo;
                  </blockquote>
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-faint italic font-body">
                No external reference passages retrieved for this case.
              </p>
            )}
          </div>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 3: AI-Generated Clinical Explanation                             */}
        {/* ========================================================================= */}
        <ReportSection
          title="AI-generated explanation"
          badge="Grounded Decision Support Narrative"
          badgeVariant="emerald"
          icon={Sparkles}
        >
          <div className="space-y-4 pt-1">
            {/* Screening Summary Sub-block */}
            <div className="p-4 rounded bg-bg-void border border-bg-panel-border">
              <h3 className="text-xs font-semibold text-signal-gold uppercase tracking-wider mb-2 flex items-center gap-1.5 font-body">
                <CheckCircle2 className="w-4 h-4 text-signal-gold" />
                <span>Screening Metric Interpretation</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-body">
                {report.generated_explanation.screening_summary}
              </p>
            </div>

            {/* Clinical & Acoustic Context Sub-block */}
            <div className="p-4 rounded bg-bg-void border border-bg-panel-border">
              <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5 font-body">
                <FileText className="w-4 h-4 text-signal-blue" />
                <span>Vocal Biomarker Context &amp; Literature Grounding</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-body">
                {report.generated_explanation.explanation}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 4: Mandatory Legal & Clinical Disclaimer (Non-Dismissible)       */}
        {/* ========================================================================= */}
        <ReportSection
          title="Important disclaimer"
          badge="Non-Modifiable Legal Notice"
          badgeVariant="amber"
          icon={ShieldAlert}
          isDisclaimer={true}
        >
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-risk-caution shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed font-body">
              <p className="font-semibold text-ink">
                {report.clinical_disclaimer}
              </p>
              <p className="text-[11px] text-ink-muted pt-2 border-t border-bg-panel-border">
                This document is intended for educational, research, and physician decision-support reference only.
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-bg-panel-border">
          <Link
            to="/record"
            className="inline-flex items-center gap-2 text-xs font-body font-medium text-signal-gold hover:text-signal-gold-hover transition-colors"
          >
            <Mic className="w-4 h-4" />
            <span>Start New Phonation Screening</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void text-xs font-body font-semibold shadow-glow-gold transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Full Report to Clipboard' : 'Copy report as text'}</span>
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
