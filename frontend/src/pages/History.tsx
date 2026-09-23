import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout';
import {
  listHistory,
  TestRecordListItem,
  ApiError,
} from '../api/client';
import {
  Mic,
  UploadCloud,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  User,
  AudioWaveform,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Calendar,
} from 'lucide-react';

export const History: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<TestRecordListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'parkinsons_risk_indicated' | 'low_risk_indicated'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'recording' | 'upload'>('all');

  const fetchHistoryData = async (targetPage: number, pageLimit: number) => {
    setLoading(true);
    setError(null);
    const offset = (targetPage - 1) * pageLimit;

    try {
      // Fetch one extra item to accurately determine if there is a next page
      const records = await listHistory(pageLimit + 1, offset);
      if (records.length > pageLimit) {
        setHasMore(true);
        setHistoryItems(records.slice(0, pageLimit));
      } else {
        setHasMore(false);
        setHistoryItems(records);
      }
    } catch (err: unknown) {
      console.error('Failed to load screening history:', err);
      if (err instanceof ApiError) {
        setError(`API Error (${err.status}): ${err.detail}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to connect to the backend service. Ensure server is running at http://localhost:8000.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(page, limit);
  }, [page, limit]);

  // Client-side filtering across current page records
  const filteredRecords = useMemo(() => {
    return historyItems.filter((item) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.id.toLowerCase().includes(query) ||
        (item.test_id && item.test_id.toLowerCase().includes(query));

      // Outcome match
      const matchesOutcome =
        filterOutcome === 'all' || item.prediction === filterOutcome;

      // Source match
      const matchesSource =
        filterSource === 'all' || item.source === filterSource;

      return matchesSearch && matchesOutcome && matchesSource;
    });
  }, [historyItems, searchQuery, filterOutcome, filterSource]);

  const offsetStart = (page - 1) * limit + 1;
  const offsetEnd = (page - 1) * limit + historyItems.length;

  return (
    <PageContainer
      title="Screening History &amp; Longitudinal Log"
      subtitle="Complete chronological audit trail of vocal acoustic screenings, time-aligned rollout maps, and clinical reports."
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/record"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Mic className="w-3.5 h-3.5" />
            New Recording
          </Link>
          <button
            type="button"
            onClick={() => fetchHistoryData(page, limit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-subtle disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="sm:col-span-1 lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Patient ID or Session UUID..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Outcome Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value as typeof filterOutcome)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="all">All Screening Outcomes</option>
                <option value="parkinsons_risk_indicated">Elevated Risk Indicated</option>
                <option value="low_risk_indicated">Low Risk Indicated</option>
              </select>
            </div>

            {/* Modality Filter */}
            <div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="all">All Input Modalities</option>
                <option value="recording">Live Phonation Recording</option>
                <option value="upload">Audio File Upload</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Failed to Query Screening Repository</p>
              <p className="text-red-800 mt-0.5">{error}</p>
              <button
                onClick={() => fetchHistoryData(page, limit)}
                className="mt-2 inline-flex items-center gap-1 font-semibold text-red-900 underline hover:no-underline"
              >
                <RefreshCw className="w-3 h-3" /> Retry query
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-card text-center">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">Loading Screening Records...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fetching from local SQLite repository</p>
          </div>
        )}

        {/* Empty State (No records in DB or no search matches) */}
        {!loading && !error && filteredRecords.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-12 shadow-card text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <AudioWaveform className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              {searchQuery || filterOutcome !== 'all' || filterSource !== 'all'
                ? 'No Records Match Filter'
                : 'No Screening Sessions Recorded Yet'}
            </h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
              {searchQuery || filterOutcome !== 'all' || filterSource !== 'all'
                ? 'Try resetting your search query or selecting "All Screening Outcomes".'
                : 'Begin a new screening session by recording sustained vowel phonation (/a/) or uploading an audio clip.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/record"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                Start Live Record
              </Link>
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Audio File
              </Link>
            </div>
          </div>
        )}

        {/* Desktop / Tablet Structured Table */}
        {!loading && !error && filteredRecords.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date &amp; Time</th>
                    <th className="py-3.5 px-4">Patient / Session ID</th>
                    <th className="py-3.5 px-3">Modality</th>
                    <th className="py-3.5 px-4">Screening Outcome</th>
                    <th className="py-3.5 px-4 text-right">Acoustic Score</th>
                    <th className="py-3.5 px-3 text-center">Report</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((item) => {
                    const isElevated = item.prediction === 'parkinsons_risk_indicated';
                    const probPct = (item.probability * 100).toFixed(1);
                    const dateObj = new Date(item.created_at);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-medium text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dateObj.toLocaleDateString()}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono ml-5.5">
                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>

                        {/* Patient / Session Ref ID */}
                        <td className="py-3.5 px-4">
                          {item.test_id ? (
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[130px]">{item.test_id}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">&mdash;</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[130px]" title={item.id}>
                            {item.id}
                          </span>
                        </td>

                        {/* Modality */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {item.source === 'recording' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <Mic className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <UploadCloud className="w-3 h-3" /> Upload
                            </span>
                          )}
                        </td>

                        {/* Screening Outcome (Strict Non-Diagnostic Language) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isElevated ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                              Risk Indicated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                              Low Risk
                            </span>
                          )}
                        </td>

                        {/* Probability Score */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isElevated ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {probPct}%
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {item.audio_duration_sec.toFixed(1)}s
                          </span>
                        </td>

                        {/* Report Status */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {item.has_report ? (
                            <Link
                              to={`/report/${item.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Click to view full decision support report"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ready</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              None
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/result/${item.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors border border-slate-200"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                            {item.has_report && (
                              <Link
                                to={`/report/${item.id}`}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                                title="Open Clinical Report"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong>{historyItems.length > 0 ? offsetStart : 0}</strong> &ndash; <strong>{offsetEnd}</strong> records
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-400 text-[11px]">Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Prev / Next Page Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-mono font-semibold text-slate-800">
                  Page {page}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer Line */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Audit &amp; Privacy Notice:</strong> Raw audio waveforms are never saved to disk and are purged from memory immediately post-inference. Only mathematical attention rollouts and non-diagnostic risk scores are preserved for clinical continuity.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
