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
  CheckCircle2,
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
${evidenceText}

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
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-card text-center max-w-xl mx-auto">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">No Report Selected</h2>
          <p className="text-sm text-slate-600 mb-6">
            Please perform a voice screening or select an existing session from history to view its clinical report.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all"
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-card text-center max-w-lg mx-auto">
          <Activity className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Retrieving Clinical Report</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{id}</p>
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Result
          </Link>
        }
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-card max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Generate Decision Support Report
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            This screening session has an acoustic prediction on record, but the grounded literature synthesis has not yet been triggered.
          </p>

          <button
            type="button"
            onClick={handleGenerateNow}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
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
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs text-left flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 mb-0.5">LLM Synthesis Unavailable</p>
                <p className="leading-relaxed">{genError}</p>
                <p className="mt-1 text-slate-600">
                  Configure <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">LLM_API_KEY</code> in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> to enable free hosted synthesis.
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
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-card max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Report</h2>
          <p className="text-xs text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 mb-6 text-left font-mono">
            {error || 'Unknown error occurred.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => fetchReportData(id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Back to History
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
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/result/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Screening Result</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy as Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* Section 1: Model Prediction (Raw Neural Data - Untouched by LLM)         */}
        {/* ========================================================================= */}
        <ReportSection
          title="1. Model Acoustic Prediction"
          badge="Raw Neural Network Output (Untouched by LLM)"
          badgeVariant="blue"
          icon={Cpu}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Risk Classification */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Screening Classification
              </span>
              <div className="flex items-center gap-2 mt-1">
                {isElevated ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                    <span className="font-bold text-sm text-red-950">
                      Parkinson&rsquo;s-Risk Indicators
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="font-bold text-sm text-emerald-950">
                      Low-Risk Indicated
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Probability Score */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Calibrated Probability
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-2xl font-extrabold font-mono ${
                    isElevated ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {probFormatted}%
                </span>
                <span className="text-xs text-slate-500">acoustic risk score</span>
              </div>
            </div>

            {/* Decision Threshold */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Decision Threshold
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-slate-800">
                  {threshFormatted}%
                </span>
                <span className="text-xs text-slate-500">calibrated cutoff</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 italic">
            * Values represent raw continuous probabilities from the self-supervised acoustic backbone without alteration.
          </p>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 2: Retrieved Reference Information (Curated Evidence)             */}
        {/* ========================================================================= */}
        <ReportSection
          title="2. Retrieved Authoritative Evidence"
          badge="Curated Medical Literature (Untouched by LLM)"
          badgeVariant="purple"
          icon={BookOpen}
        >
          <div className="space-y-3 pt-1">
            {report.retrieved_evidence.map((chunk, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 transition-all hover:bg-slate-100/70"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {chunk.source_name}
                    </span>
                  </div>

                  {chunk.source_url && (
                    <a
                      href={chunk.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span>Citation Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <blockquote className="text-xs text-slate-700 leading-relaxed pl-2 border-l-2 border-purple-300 italic">
                  &ldquo;{chunk.text}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 3: AI-Generated Clinical Explanation                             */}
        {/* ========================================================================= */}
        <ReportSection
          title="3. AI-Generated Clinical Synthesis"
          badge="Grounded Decision Support Narrative"
          badgeVariant="emerald"
          icon={Sparkles}
        >
          <div className="space-y-4 pt-1">
            {/* Screening Summary Sub-block */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Screening Metric Interpretation
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {report.generated_explanation.screening_summary}
              </p>
            </div>

            {/* Clinical & Acoustic Context Sub-block */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                Vocal Biomarker Context &amp; Literature Grounding
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {report.generated_explanation.explanation}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* ========================================================================= */}
        {/* Section 4: Mandatory Legal & Clinical Disclaimer (Non-Dismissible)       */}
        {/* ========================================================================= */}
        <ReportSection
          title="4. Mandatory Clinical &amp; Research Disclaimer"
          badge="Non-Modifiable Legal Notice"
          badgeVariant="amber"
          icon={ShieldAlert}
          isDisclaimer={true}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs sm:text-sm text-amber-950 leading-relaxed">
              <p>
                <strong>{report.clinical_disclaimer}</strong>
              </p>
              <p className="text-[11px] text-amber-900/90 pt-1 border-t border-amber-300/80">
                This document is intended for educational, research, and physician decision-support reference only.
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <Link
            to="/record"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <Mic className="w-4 h-4" />
            Start New Phonation Screening
          </Link>

          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Full Report to Clipboard' : 'Copy Full Report Text'}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
