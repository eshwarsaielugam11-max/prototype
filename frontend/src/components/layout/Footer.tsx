import React from 'react';
import { AlertCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      {/* Primary Always-Visible Medical Disclaimer Banner */}
      <div className="bg-slate-100/80 border-b border-slate-200 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-slate-700 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            <strong>RESEARCH &amp; SCREENING TOOL ONLY:</strong> Not a diagnostic device.
            This system does not replace a clinical examination by a qualified neurologist.
          </span>
        </div>
      </div>

      {/* Secondary Meta Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Parkinson's Disease Voice Screening Platform &bull; Local Clinical CDS v1.0.0
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              API: Connected (localhost:8000)
            </span>
            <span>&copy; {new Date().getFullYear()} Clinical Research Prototype</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
