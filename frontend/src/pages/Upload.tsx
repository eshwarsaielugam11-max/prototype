import React from 'react';
import { PageContainer } from '../components/layout';
import { UploadCloud, FileAudio } from 'lucide-react';

export const Upload: React.FC = () => {
  return (
    <PageContainer
      title="Upload Speech Audio"
      subtitle="Analyze pre-recorded voice files in WAV, FLAC, or OGG format."
    >
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-card max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Drag &amp; Drop Audio Ingestion</h2>
        <p className="text-sm text-slate-600 mb-6">
          Accepts multi-second voice recordings up to 25MB. Performs client-side codec checking
          before streaming to the /api/v1/predict endpoint.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
          <FileAudio className="w-4 h-4 text-slate-500" />
          Awaiting Upload Implementation (Prompt 20)
        </div>
      </div>
    </PageContainer>
  );
};
