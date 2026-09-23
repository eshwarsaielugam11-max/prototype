import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-bg-panel-border bg-bg-void">
      {/* Permanent, Always-Legible Clinical Research Disclaimer */}
      <div className="border-b border-bg-panel-border/60 py-4 px-4 bg-bg-panel/40">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-center gap-3 text-xs text-ink-muted">
          <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <p className="leading-relaxed text-center sm:text-left">
            <strong className="text-ink font-medium">Research Screening Tool Notice:</strong> This platform is designed for research and clinical decision support. It does not provide medical diagnoses or rule out Parkinson&rsquo;s disease. Always consult a qualified medical professional for clinical evaluation.
          </p>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-ink">Vocalis</span>
            <span className="text-ink-faint">&bull;</span>
            <span>Self-Supervised Acoustic Transformer CDS</span>
          </div>

          <div className="flex items-center gap-6 text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low" />
              Backend: 127.0.0.1:8000
            </span>
            <span className="text-ink-faint">
              &copy; {new Date().getFullYear()} Clinical Research Prototype
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
