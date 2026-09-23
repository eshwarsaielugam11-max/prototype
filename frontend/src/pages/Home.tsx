import React from 'react';
import { PageContainer } from '../components/layout';
import { Mic, UploadCloud, History, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <PageContainer
      title="Acoustic Voice Screening Platform"
      subtitle="Clinical Decision Support tool utilizing deep learning representations of sustained phonation and connected speech."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <Mic className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Live Recording</h2>
          <p className="text-sm text-slate-600 mb-4">
            Record guided sustained vowel phonation (/a/) directly through your browser with real-time mic monitoring.
          </p>
          <Link
            to="/record"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Start live recording &rarr;
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Audio Upload</h2>
          <p className="text-sm text-slate-600 mb-4">
            Upload pre-recorded WAV, FLAC, or OGG speech files for immediate acoustic feature analysis.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-800"
          >
            Upload audio file &rarr;
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
            <History className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Screening History</h2>
          <p className="text-sm text-slate-600 mb-4">
            Review past screening sessions, longitudinal progression tracking, and inspect saved clinical reports.
          </p>
          <Link
            to="/history"
            className="inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            View history &rarr;
          </Link>
        </div>
      </div>

      {/* System Status and Design Tokens Demonstration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-subtle">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Clinical Design System &amp; Status Indicators
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All color indicators strictly pair color codes with accessible textual descriptions per clinical safety criteria:
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Neutral / Information (#2563eb)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Low Risk Indicated (#16a34a)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            Caution / Borderline (#f59e0b)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Elevated Risk Indicated (#ef4444)
          </span>
        </div>
      </div>
    </PageContainer>
  );
};
