import React from 'react';
import { PageContainer } from '../components/layout';
import { AudioRecorder } from '../components/AudioRecorder';
import { Mic, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import ambientTexture from '../assets/images/ambient_texture_dark.svg';

export const Record: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-bg-void">
      {/* Restrained Ambient Particle Background Texture (~10% opacity) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ambientTexture})` }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <PageContainer
          title="Live Voice Phonation Recording"
          subtitle="Record sustained vowel phonation (/a/) with real-time waveform monitoring and acoustic neural analysis."
          maxWidth="narrow"
        >
          <div className="space-y-6">
            {/* Clinical Instruction Callout */}
            <div className="bg-bg-panel border border-signal-gold/30 rounded-lg p-5 shadow-panel">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded bg-signal-gold/15 text-signal-gold flex items-center justify-center shrink-0 border border-signal-gold/30">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="text-xs text-ink-muted leading-relaxed font-body">
                  <p className="font-semibold text-sm text-ink mb-1">
                    Recording Task Protocol: Sustained Vowel /a/
                  </p>
                  <p>
                    Take a deep breath and vocalize a continuous, steady vowel sound <strong className="font-medium text-signal-gold">&ldquo;ahhh&rdquo;</strong> at a comfortable pitch and volume for at least <strong className="text-ink">3 to 5 seconds</strong>. Ensure you are in a quiet room with minimal ambient background interference.
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Audio Recorder Component */}
            <AudioRecorder />

            {/* Protocol Checklist & Quality Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-panel p-5 rounded-lg border border-bg-panel-border shadow-panel">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-body">
                  <CheckCircle2 className="w-4 h-4 text-risk-low" />
                  <span>Recording Best Practices</span>
                </h3>
                <ul className="space-y-2 text-xs text-ink-muted font-body">
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&check;</span>
                    <span>Keep distance constant (approx. 10&ndash;15 cm from mic).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&check;</span>
                    <span>Avoid coughing, whispering, or abrupt pitch modulations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&check;</span>
                    <span>Verify waveform activity on the oscilloscope before stopping.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-bg-panel p-5 rounded-lg border border-bg-panel-border shadow-panel">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-body">
                  <HelpCircle className="w-4 h-4 text-signal-blue" />
                  <span>Microphone Troubleshooting</span>
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-2 font-body">
                  If microphone access is blocked, check your browser permissions icon in the address bar (lock/settings icon) and set microphone permission to &ldquo;Allow&rdquo;.
                </p>
                <p className="text-[11px] text-ink-faint font-mono">
                  Supported: Chrome, Firefox, Safari, Edge (MediaRecorder enabled).
                </p>
              </div>
            </div>

            {/* Safety Disclaimer */}
            <div className="p-4 rounded-lg bg-bg-panel/60 border border-bg-panel-border text-xs text-ink-muted flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-ink font-medium">Research &amp; Screening Notice:</strong> This recording interface transmits audio directly to the local acoustic screening engine. Predictions are non-diagnostic risk evaluations intended for clinical research.
              </p>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
};
