import React from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import { BarChart3, Clock } from 'lucide-react';

export const Result: React.FC = () => {
  const { id } = useParams<{ id?: string }>();

  return (
    <PageContainer
      title="Screening Results &amp; Explainability"
      subtitle="Acoustic model prediction, calibrated risk probability, and time-aligned attention rollout."
    >
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Screening Result Visualizer</h2>
        <p className="text-sm text-slate-600 mb-6">
          {id ? (
            <span>Inspecting screening record ID: <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{id}</code></span>
          ) : (
            <span>No screening record selected. Submit a recording or upload to view acoustic explainability.</span>
          )}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
          <Clock className="w-4 h-4 text-slate-500" />
          Awaiting Result Visualizer (Prompt 21)
        </div>
      </div>
    </PageContainer>
  );
};
