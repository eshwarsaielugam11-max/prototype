import React from 'react';
import { PageContainer } from '../components/layout';
import { Mic, Volume2 } from 'lucide-react';

export const Record: React.FC = () => {
  return (
    <PageContainer
      title="Live Audio Recording"
      subtitle="Capture sustained vowel phonation (/a/) with real-time waveform visualization."
    >
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Mic className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Microphone Recording Interface</h2>
        <p className="text-sm text-slate-600 mb-6">
          This module will provide Web Audio API recording, VU-meter level checks, 
          silence detection, and countdown guidance for sustained phonation.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
          <Volume2 className="w-4 h-4 text-slate-500" />
          Awaiting Recording Configuration (Prompt 19)
        </div>
      </div>
    </PageContainer>
  );
};
