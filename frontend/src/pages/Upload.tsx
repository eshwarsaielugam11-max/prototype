import React from 'react';
import { PageContainer } from '../components/layout';
import { UploadDropzone } from '../components/UploadDropzone';
import { UploadCloud, FileAudio, ShieldAlert, CheckCircle2 } from 'lucide-react';
import ambientTexture from '../assets/images/ambient_texture_dark.svg';

export const Upload: React.FC = () => {
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
          title="Upload Voice Audio Recording"
          subtitle="Analyze pre-recorded voice files in WAV, FLAC, OGG, or MP3 format with the neural screening engine."
          maxWidth="narrow"
        >
          <div className="space-y-6">
            {/* Instruction Callout */}
            <div className="bg-bg-panel border border-signal-blue/30 rounded-lg p-5 shadow-panel">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded bg-signal-blue/15 text-signal-blue flex items-center justify-center shrink-0 border border-signal-blue/30">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div className="text-xs text-ink-muted leading-relaxed font-body">
                  <p className="font-semibold text-sm text-ink mb-1">
                    Supported Audio Ingestion Formats
                  </p>
                  <p>
                    Upload speech recordings (<code className="font-mono text-signal-gold bg-bg-void px-1 py-0.5 rounded border border-bg-panel-border">.wav</code>, <code className="font-mono text-signal-gold bg-bg-void px-1 py-0.5 rounded border border-bg-panel-border">.flac</code>, <code className="font-mono text-signal-gold bg-bg-void px-1 py-0.5 rounded border border-bg-panel-border">.ogg</code>, <code className="font-mono text-signal-gold bg-bg-void px-1 py-0.5 rounded border border-bg-panel-border">.mp3</code>).
                    Audio is automatically resampled to 16kHz mono and calibrated by the backend preprocessor.
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Upload Dropzone Component */}
            <UploadDropzone />

            {/* Technical Specification Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-panel p-5 rounded-lg border border-bg-panel-border shadow-panel">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-body">
                  <CheckCircle2 className="w-4 h-4 text-risk-low" />
                  <span>File Requirements &amp; Limits</span>
                </h3>
                <ul className="space-y-2 text-xs text-ink-muted font-body">
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&bull;</span>
                    <span><strong className="text-ink font-medium">Maximum Size:</strong> 25 MB per recording.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&bull;</span>
                    <span><strong className="text-ink font-medium">Recommended Duration:</strong> 3.0 to 10.0 seconds.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-risk-low font-bold">&bull;</span>
                    <span><strong className="text-ink font-medium">Channel:</strong> Mono or stereo (automatically downmixed).</span>
                  </li>
                </ul>
              </div>

              <div className="bg-bg-panel p-5 rounded-lg border border-bg-panel-border shadow-panel">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-body">
                  <FileAudio className="w-4 h-4 text-signal-gold" />
                  <span>Preprocessing Pipeline</span>
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-2 font-body">
                  Every uploaded sample undergoes non-speech silence trimming, peak RMS normalization, and time-frame alignment matching the self-supervised acoustic backbone.
                </p>
                <p className="text-[11px] text-ink-faint font-mono">
                  Zero persistence: raw audio is unlinked immediately post-inference.
                </p>
              </div>
            </div>

            {/* Safety Disclaimer */}
            <div className="p-4 rounded-lg bg-bg-panel/60 border border-bg-panel-border text-xs text-ink-muted flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
              <p className="leading-relaxed font-body">
                <strong className="text-ink font-medium">Research &amp; Screening Notice:</strong> Uploaded voice samples are evaluated exclusively for acoustic research and screening decision support. Not intended as a standalone diagnostic instrument.
              </p>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
};
