import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import { ArrowRight, ShieldAlert, Sparkles, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import heroImage from '../assets/images/hero_voice_signal.jpg';
import explainabilityImage from '../assets/images/explainability_field.jpg';
import evidenceImage from '../assets/images/evidence_bloom.jpg';

export const Home: React.FC = () => {
  return (
    <div className="bg-bg-void text-ink min-h-screen">
      {/* 1. HERO SECTION: Full-bleed Cinematic Experience */}
      <section className="relative min-h-[92vh] sm:min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16">
        {/* Full-bleed background hero image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Person vocalizing fine stream of warm golden signal particles into the dark starlit night sky"
            className="w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.85] contrast-[1.05]"
          />
          {/* Subtle top shade for navigation contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg-void/80 via-transparent to-transparent h-32" />
          {/* Dense bottom & radial gradients for guaranteed WCAG AAA headline contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-void via-bg-void/85 to-transparent h-full" />
          <div className="absolute inset-0 bg-radial-at-c from-bg-void/40 via-bg-void/70 to-bg-void/90" />
        </div>

        {/* Hero Content Overlay */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-panel/80 backdrop-blur-md border border-bg-panel-border text-xs text-signal-gold font-body mb-6 shadow-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-gold animate-pulse" />
            <span>Acoustic Neural Screening &bull; Clinical Decision Support</span>
          </div>

          {/* Reserved Hero Boldness: Only "reveals" in Fraunces 300 Italic */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-light text-ink tracking-tight leading-[1.12] mb-6">
            Hear what your voice <span className="italic text-signal-gold font-light">reveals</span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-ink-muted font-body leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            A research screening tool translating subtle acoustic perturbations in sustained phonation into transparent neural salience patterns and grounded clinical evidence.
          </p>

          {/* Primary CTA and Secondary Record Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              to="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-sm font-semibold shadow-glow-gold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none active:scale-95"
            >
              <span>Begin Screening</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/record"
              className="text-sm font-body text-ink-muted hover:text-ink transition-colors px-4 py-2 rounded focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none underline decoration-bg-panel-border hover:decoration-signal-gold underline-offset-4"
            >
              or record now with microphone &rarr;
            </Link>
          </div>

          {/* Mandatory Immediate Clinical Disclaimer (Directly Below CTA) */}
          <div className="max-w-xl mx-auto text-xs text-ink-muted/90 leading-relaxed font-body flex items-center justify-center gap-2 pt-2">
            <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0" aria-hidden="true" />
            <p>
              <strong className="text-ink font-medium">Research Tool:</strong> Not a diagnostic device. Consult a neurologist for medical diagnosis.
            </p>
          </div>
        </div>
      </section>

      {/* 2. EXPLAINABLE BY DESIGN SECTION */}
      <section className="relative py-24 sm:py-32 overflow-hidden border-t border-bg-panel-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-lg overflow-hidden border border-bg-panel-border bg-bg-panel shadow-panel">
            {/* Background Image of open field under night sky */}
            <div className="absolute inset-0 z-0">
              <img
                src={explainabilityImage}
                alt="Lone silhouette walking through a gently glowing field of grass beneath a starlit sky"
                className="w-full h-full object-cover object-right md:object-center filter brightness-[0.75]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-bg-void via-bg-void/90 to-bg-void/30 md:to-transparent" />
            </div>

            {/* Overlaid Glass Panel with Plain-Language Explainability Copy */}
            <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-signal-gold mb-4">
                <Sparkles className="w-4 h-4" />
                <span>Explainable by Design</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-display font-medium text-ink tracking-tight mb-5 leading-tight">
                No black boxes. Every finding is time-mapped to your voice.
              </h2>

              <p className="text-sm sm:text-base text-ink-muted font-body leading-relaxed mb-6 font-normal">
                When the acoustic neural network evaluates sustained vowel phonation, it does not simply return an opaque percentage. It computes a time-aligned attention rollout map showing the exact fractions of a second where micro-tremors, pitch instability, or hypophonic dampening occurred.
              </p>

              <p className="text-xs sm:text-sm text-ink-muted/90 font-body leading-relaxed mb-8">
                Clinicians and patients can hover over each acoustic frame to inspect salience values and correlate vocal changes with calibrated thresholds.
              </p>

              <Link
                to="/record"
                className="inline-flex items-center gap-2 text-sm font-body font-medium text-signal-gold hover:text-signal-gold-hover transition-colors group"
              >
                <span>Experience live phonation analysis</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GROUNDED IN EVIDENCE SECTION (Two Columns with Macro Image) */}
      <section className="py-20 sm:py-28 border-t border-bg-panel-border/80">
        <PageContainer maxWidth="wide" className="pt-0 pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Macro Botanical Evidence Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-lg overflow-hidden border border-bg-panel-border shadow-panel aspect-4/3 lg:aspect-square">
                <img
                  src={evidenceImage}
                  alt="Macro photograph of dew-lit foliage with points of warm bioluminescent light in quiet darkness"
                  className="w-full h-full object-cover filter brightness-[0.9] contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-void/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded bg-bg-panel/90 backdrop-blur border border-bg-panel-border text-xs text-ink-muted font-body">
                  <span className="text-signal-gold font-medium">Curated Citations:</span> Movement Disorders, IEEE Transactions, and Lancet Neurology literature.
                </div>
              </div>
            </div>

            {/* Right Column: Grounded Evidence & Transparency Philosophy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-signal-blue mb-1">
                <BookOpen className="w-4 h-4" />
                <span>Grounded Evidence &amp; Integrity</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-display font-medium text-ink tracking-tight leading-tight">
                Peer-reviewed literature, cited directly in every report.
              </h2>

              <p className="text-sm sm:text-base text-ink-muted font-body leading-relaxed">
                Large language models are prone to hallucinating medical certainty. In this platform, report generation uses retrieval-augmented generation (RAG) strictly anchored to authoritative peer-reviewed neurology papers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded bg-bg-panel border border-bg-panel-border">
                  <h3 className="text-xs font-body font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-risk-low" />
                    <span>Strict Non-Diagnostic Language</span>
                  </h3>
                  <p className="text-xs text-ink-muted font-body leading-relaxed">
                    Automated safety blocklists ensure reports never claim medical certainty or replace clinical judgment.
                  </p>
                </div>

                <div className="p-4 rounded bg-bg-panel border border-bg-panel-border">
                  <h3 className="text-xs font-body font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-signal-gold" />
                    <span>Zero Audio Retention</span>
                  </h3>
                  <p className="text-xs text-ink-muted font-body leading-relaxed">
                    Audio recordings are processed in memory and unlinked immediately post-inference to preserve privacy.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-xs font-semibold shadow-glow-gold transition-all duration-150"
                >
                  <span>Upload Audio Clip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/history"
                  className="inline-flex items-center gap-2 text-xs font-body font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  <span>Browse past screening records</span>
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
};
