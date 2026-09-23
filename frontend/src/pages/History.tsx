import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout';
import { History as HistoryIcon, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { listHistory, checkHealth, HealthStatus, TestRecordListItem } from '../api/client';

export const History: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [historyItems, setHistoryItems] = useState<TestRecordListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, records] = await Promise.all([
        checkHealth(),
        listHistory(10, 0),
      ]);
      setHealth(h);
      setHistoryItems(records);
      console.log('[API Test] Successfully fetched health status from backend:', h);
      console.log('[API Test] Successfully fetched screening history from backend:', records);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('[API Test] Failed to communicate with backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageContainer
      title="Screening History &amp; Longitudinal Trends"
      subtitle="Complete database of previous screening sessions and generated decision support reports."
      actions={
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-subtle disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Connection
        </button>
      }
    >
      <div className="space-y-6">
        {/* Backend API Connectivity Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-blue-600" />
            Backend API Connectivity &amp; Contract Verification
          </h3>

          {loading && (
            <p className="text-xs text-slate-500 animate-pulse">
              Querying backend endpoints (/api/v1/health, /api/v1/history)...
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Error:</p>
                <p>{error}</p>
                <p className="mt-1 text-slate-600">Ensure FastAPI backend is running at http://localhost:8000</p>
              </div>
            </div>
          )}

          {health && !error && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Backend: {health.status.toUpperCase()}
              </span>
              <span className="text-slate-600">
                Model Artifact: <strong>{health.model_artifact_found ? 'Loaded (model.pt)' : 'Missing'}</strong>
              </span>
              <span className="text-slate-600">
                Database Records: <strong>{historyItems.length} fetched</strong>
              </span>
            </div>
          )}
        </div>

        {/* Stub list preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card text-center">
          <p className="text-sm text-slate-600 mb-4">
            Full longitudinal progression table and individual session inspectors will be implemented in Prompt 23.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            Active Records in SQLite: {historyItems.length}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
