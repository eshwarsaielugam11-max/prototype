import React from 'react';
import { PageContainer } from '../components/layout';
import { Mic, UploadCloud, History, Activity, ShieldAlert, Cpu, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <PageContainer>
      {/* Hero Introduction */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-4">
          <Activity className="w-3.5 h-3.5" />
          Acoustic Biomarker Decision Support System
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Non-Invasive Vocal Biomarker Screening for Parkinson&rsquo;s Disease
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          Leveraging self-supervised speech representations (<code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">WavLM</code>)
          and time-aligned attention rollout to detect early acoustic markers associated with hypophonia and vocal dysregulation.
        </p>

        {/* Quick Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/record"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
          >
            <Mic className="w-4 h-4" />
            Start Live Voice Recording
          </Link>
          <Link
            to="/upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-sm transition-all active:scale-95"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            Upload Audio Recording
          </Link>
        </div>
      </div>

      {/* Prominent High-Visibility Medical Disclaimer Block */}
      <div className="max-w-4xl mx-auto mb-12 p-5 sm:p-6 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider mb-1">
              Important Clinical &amp; Research Disclaimer
            </h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>This is a research screening tool. It does not diagnose Parkinson&rsquo;s disease.</strong>{' '}
              Acoustic screening provides an automated, non-invasive risk indicator based on vocal acoustic stability.
              Vocal variations may also occur due to respiratory infections, fatigue, aging, or unrelated vocal fold conditions.
              Consult a qualified healthcare professional or neurologist for any clinical concerns or formal neurological diagnosis.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works - 4 Step Pipeline */}
      <div className="max-w-5xl mx-auto mb-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">How the Screening Pipeline Works</h2>
          <p className="text-sm text-slate-500 mt-1">End-to-end transparent, explainable decision support architecture</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-blue-600" /> Vocal Capture
            </h3>
            <p className="text-xs text-slate-600 leading-normal flex-1">
              Sustained vowel phonation (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">/a/</code>)
              captured via browser microphone or audio file upload (16kHz mono).
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" /> WavLM Encoding
            </h3>
            <p className="text-xs text-slate-600 leading-normal flex-1">
              Neural feature extraction via 12-layer WavLM transformer generating 768-dim temporal acoustic frames.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm mb-3">
              3
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" /> Explainability
            </h3>
            <p className="text-xs text-slate-600 leading-normal flex-1">
              Multi-head attention rollout computes time-aligned acoustic importance across phonation segments.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm mb-3">
              4
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" /> Grounded Report
            </h3>
            <p className="text-xs text-slate-600 leading-normal flex-1">
              RAG evidence retrieval from curated literature + guardrailed LLM synthesis for clinical review.
            </p>
          </div>
        </div>
      </div>

      {/* Protocol Guidelines & Clinical Design Standards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phonation Protocol */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Recommended Phonation Protocol
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
              <span><strong>Environment:</strong> Sit in a quiet room with minimal ambient background noise or echo.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
              <span><strong>Distance:</strong> Position microphone approximately 10&ndash;15 cm (4&ndash;6 inches) from mouth.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
              <span><strong>Phonation:</strong> Inhale deeply and sustain a steady vowel sound <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">/a/</code> (&ldquo;ahhh&rdquo;) for 3 to 5 seconds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
              <span><strong>Pitch &amp; Volume:</strong> Maintain a comfortable, natural pitch and steady conversational volume.</span>
            </li>
          </ul>
        </div>

        {/* Clinical History & Record Access */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Audit Trail &amp; Longitudinal History
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              All screening runs are stored in the local clinical repository with time-stamped attention rollout maps and optional patient reference IDs.
            </p>
          </div>
          <Link
            to="/history"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors"
          >
            <span>Review screening history records</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};
