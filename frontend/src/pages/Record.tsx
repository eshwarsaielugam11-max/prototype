import React from 'react';
import { PageContainer } from '../components/layout';
import { AudioRecorder } from '../components/AudioRecorder';
import { Mic, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Record: React.FC = () => {
  return (
    <PageContainer
      title="Live Voice Phonation Recording"
      subtitle="Record sustained vowel phonation (/a/) with real-time waveform monitoring and acoustic neural analysis."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Clinical Instruction Callout */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-950 leading-relaxed">
              <p className="font-bold text-sm text-blue-900 mb-1">
                Recording Task Protocol: Sustained Vowel /a/
              </p>
              <p>
                Take a deep breath and vocalize a continuous, steady vowel sound <strong className="font-semibold text-blue-900">&ldquo;ahhh&rdquo;</strong> at a comfortable pitch and volume for at least <strong>3 to 5 seconds</strong>. Ensure you are in a quiet room with minimal ambient background interference.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Audio Recorder Component */}
        <AudioRecorder />

        {/* Protocol Checklist & Quality Factors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recording Best Practices
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&check;</span>
                <span>Keep distance constant (approx. 10&ndash;15 cm from mic).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&check;</span>
                <span>Avoid coughing, whispering, or abrupt pitch modulations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&check;</span>
                <span>Verify waveform activity on the oscilloscope before stopping.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              Microphone Troubleshooting
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              If microphone access is blocked, check your browser permissions icon in the address bar (lock/settings icon) and set microphone permission to &ldquo;Allow&rdquo;.
            </p>
            <p className="text-[11px] text-slate-400">
              Supported browsers: Chrome, Firefox, Edge, Safari (MediaRecorder enabled).
            </p>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Research &amp; Screening Notice:</strong> This recording interface transmits audio directly to the local acoustic screening engine. Predictions are non-diagnostic risk evaluations intended for clinical research.
          </span>
        </div>
      </div>
    </PageContainer>
  );
};
