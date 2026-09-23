import React from 'react';
import { PageContainer } from '../components/layout';
import { Mic, UploadCloud, History, ShieldAlert, Cpu, Sparkles, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <PageContainer maxWidth="wide">
      {/* Hero: Voice Becoming Visible Signal */}
      <section className="relative pt-6 pb-16 sm:pb-24 text-center max-w-4xl mx-auto overflow-hidden">
        {/* Subtle Ambient Signal Glow in background */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-gradient-to-tr from-signal-gold/10 via-signal-blue/10 to-transparent blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-panel border border-bg-panel-border text-xs text-signal-gold font-body mb-6 shadow-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-gold animate-pulse" />
          <span>Acoustic Neural Screening &bull; Clinical CDS</span>
        </div>

        {/* The Project's One Bold Gesture: Fraunces Italic Display Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-light italic text-ink tracking-tight leading-[1.15] mb-6">
          Voice becoming visible signal.
        </h1>

        <p className="text-base sm:text-lg text-ink-muted font-body leading-relaxed max-w-2xl mx-auto mb-10 font-normal">
          Non-invasive acoustic biomarker screening for Parkinson&rsquo;s disease. Translating subtle vocal fold perturbations into time-aligned neural attention patterns and grounded clinical evidence.
        </p>

        {/* Quick Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            to="/record"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-sm font-semibold shadow-glow-gold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
          >
            <Mic className="w-4 h-4" />
            <span>Start Live Phonation</span>
          </Link>
          <Link
            to="/upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-bg-panel hover:bg-bg-panel-elevated text-ink font-body text-sm font-medium border border-bg-panel-border shadow-subtle transition-all duration-150 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
          >
            <UploadCloud className="w-4 h-4 text-ink-muted" />
            <span>Upload Audio File</span>
          </Link>
        </div>
      </section>

      {/* Prominent High-Visibility Medical Disclaimer Block */}
      <section className="max-w-4xl mx-auto mb-16 p-6 rounded bg-bg-panel border border-risk-caution/30 shadow-panel">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-risk-caution/15 text-risk-caution flex items-center justify-center shrink-0 border border-risk-caution/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-body font-semibold text-signal-gold uppercase tracking-wider mb-1.5">
              Mandatory Clinical &amp; Research Disclaimer
            </h2>
            <p className="text-sm text-ink-muted font-body leading-relaxed">
              <strong className="text-ink font-medium">This is a research screening tool. It does not diagnose Parkinson&rsquo;s disease.</strong>{' '}
              Acoustic screening computes self-supervised risk probabilities based on vocal stability. Acoustic deviations can also stem from fatigue, respiratory illness, normal aging, or benign dysphonia. Consult a licensed neurologist for clinical evaluation and diagnostic confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - 4 Step Pipeline */}
      <section className="max-w-5xl mx-auto mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink tracking-tight">
            How the Screening Pipeline Operates
          </h2>
          <p className="text-sm text-ink-muted font-body mt-2">
            Transparent, multi-stage decision support from raw audio waveform to synthesized literature review.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-bg-panel p-5 rounded border border-bg-panel-border shadow-panel flex flex-col">
            <div className="w-7 h-7 rounded bg-bg-panel-elevated border border-bg-panel-border text-signal-gold font-mono text-xs font-bold flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="font-body font-semibold text-ink text-sm mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-signal-gold" />
              <span>Vocal Capture</span>
            </h3>
            <p className="text-xs text-ink-muted font-body leading-relaxed flex-1">
              Sustained vowel phonation (<code className="font-mono text-[11px] text-signal-gold bg-bg-void px-1 py-0.5 rounded border border-bg-panel-border">/a/</code>) captured via browser microphone or standard audio upload (16kHz mono).
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-bg-panel p-5 rounded border border-bg-panel-border shadow-panel flex flex-col">
            <div className="w-7 h-7 rounded bg-bg-panel-elevated border border-bg-panel-border text-signal-blue font-mono text-xs font-bold flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="font-body font-semibold text-ink text-sm mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-signal-blue" />
              <span>WavLM Transformer</span>
            </h3>
            <p className="text-xs text-ink-muted font-body leading-relaxed flex-1">
              Self-supervised acoustic embeddings encode deep micro-jitter, shimmer, and vocal tract dynamics into 768-dim temporal frames.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-bg-panel p-5 rounded border border-bg-panel-border shadow-panel flex flex-col">
            <div className="w-7 h-7 rounded bg-bg-panel-elevated border border-bg-panel-border text-signal-gold font-mono text-xs font-bold flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="font-body font-semibold text-ink text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-signal-gold" />
              <span>Attention Rollout</span>
            </h3>
            <p className="text-xs text-ink-muted font-body leading-relaxed flex-1">
              Multi-head attention rollout visualizes exact acoustic time slices that drove the network&rsquo;s calibrated risk score.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-bg-panel p-5 rounded border border-bg-panel-border shadow-panel flex flex-col">
            <div className="w-7 h-7 rounded bg-bg-panel-elevated border border-bg-panel-border text-risk-low font-mono text-xs font-bold flex items-center justify-center mb-4">
              04
            </div>
            <h3 className="font-body font-semibold text-ink text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-risk-low" />
              <span>Grounded Synthesis</span>
            </h3>
            <p className="text-xs text-ink-muted font-body leading-relaxed flex-1">
              Retrieval-augmented generation (RAG) correlates acoustic patterns with curated peer-reviewed neurology literature.
            </p>
          </div>
        </div>
      </section>

      {/* Phonation Protocol & Longitudinal Audit */}
      <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protocol Card */}
        <div className="bg-bg-panel p-6 rounded border border-bg-panel-border shadow-panel">
          <h3 className="text-base font-display font-medium text-ink mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-signal-gold" />
            <span>Recommended Phonation Protocol</span>
          </h3>
          <ul className="space-y-3 text-xs text-ink-muted font-body">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-gold mt-1.5 shrink-0" />
              <span><strong className="text-ink font-medium">Environment:</strong> Quiet acoustic room with minimal echo or background voices.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-gold mt-1.5 shrink-0" />
              <span><strong className="text-ink font-medium">Position:</strong> Maintain microphone roughly 10&ndash;15 cm (4&ndash;6 inches) from mouth.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-gold mt-1.5 shrink-0" />
              <span><strong className="text-ink font-medium">Phonation:</strong> Inhale deeply and sustain a steady vowel sound <code className="font-mono bg-bg-void px-1 py-0.5 rounded text-signal-gold border border-bg-panel-border">/a/</code> (&ldquo;ahhh&rdquo;) for 3 to 5 seconds.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-gold mt-1.5 shrink-0" />
              <span><strong className="text-ink font-medium">Consistency:</strong> Speak at a steady, comfortable conversational pitch and loudness.</span>
            </li>
          </ul>
        </div>

        {/* Audit Trail Card */}
        <div className="bg-bg-panel p-6 rounded border border-bg-panel-border shadow-panel flex flex-col justify-between">
          <div>
            <h3 className="text-base font-display font-medium text-ink mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-signal-blue" />
              <span>Audit Trail &amp; Longitudinal History</span>
            </h3>
            <p className="text-xs text-ink-muted font-body leading-relaxed mb-6">
              Every screening session is indexed in the local SQLite database alongside its temporal attention rollout and synthesized evidence report for physician review. Raw audio waveforms are purged immediately post-inference.
            </p>
          </div>
          <Link
            to="/history"
            className="inline-flex items-center justify-between px-4 py-3 rounded bg-bg-panel-elevated hover:bg-bg-panel-border border border-bg-panel-border text-xs font-body font-medium text-ink transition-colors"
          >
            <span>Review screening audit history</span>
            <ArrowRight className="w-3.5 h-3.5 text-signal-gold" />
          </Link>
        </div>
      </section>
    </PageContainer>
  );
};
