import React from 'react';
import { PageContainer } from '../components/layout';
import { UploadDropzone } from '../components/UploadDropzone';
import { UploadCloud, FileAudio, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Upload: React.FC = () => {
  return (
    <PageContainer
      title="Upload Voice Audio Recording"
      subtitle="Analyze pre-recorded voice files in WAV, FLAC, OGG, or MP3 format with the neural screening engine."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Instruction Callout */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs text-emerald-950 leading-relaxed">
              <p className="font-bold text-sm text-emerald-900 mb-1">
                Supported Audio Ingestion Formats
              </p>
              <p>
                Upload uncompressed or losslessly compressed speech recordings (<code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900">.wav</code>, <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900">.flac</code>, <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900">.ogg</code>, <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900">.mp3</code>).
                Audio is automatically resampled to 16kHz mono and calibrated to -20 dBFS by the backend preprocessor.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Upload Dropzone Component */}
        <UploadDropzone />

        {/* Technical Specification Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              File Requirements &amp; Limits
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>Maximum File Size:</strong> 25 MB per recording.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>Recommended Duration:</strong> 3.0 to 10.0 seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>Channel:</strong> Mono or stereo (stereo will be downmixed).</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-blue-600" />
              Preprocessing Pipeline
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              Every uploaded sample undergoes non-speech silence trimming, peak RMS normalization, and time-frame padding/slicing matching the exact training distribution.
            </p>
            <p className="text-[11px] text-slate-400">
              Zero audio persistence: raw audio is purged from memory immediately post-inference.
            </p>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Research &amp; Screening Notice:</strong> Uploaded voice samples are evaluated exclusively for acoustic research and screening decision support. Not intended as a standalone diagnostic instrument.
          </span>
        </div>
      </div>
    </PageContainer>
  );
};
