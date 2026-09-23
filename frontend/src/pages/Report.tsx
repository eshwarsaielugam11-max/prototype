import React from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import { FileText, ShieldAlert } from 'lucide-react';

export const Report: React.FC = () => {
  const { id } = useParams<{ id?: string }>();

  return (
    <PageContainer
      title="Clinical Decision Support Report"
      subtitle="Grounded synthesis of acoustic findings with authoritative literature citations."
    >
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Synthesized Clinical Report</h2>
        <p className="text-sm text-slate-600 mb-6">
          {id ? (
            <span>Viewing decision support report for record: <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{id}</code></span>
          ) : (
            <span>No report selected. Generate a report from a screening result to view grounded clinical insights.</span>
          )}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
          <ShieldAlert className="w-4 h-4 text-slate-500" />
          Awaiting Report Synthesizer UI (Prompt 22)
        </div>
      </div>
    </PageContainer>
  );
};
