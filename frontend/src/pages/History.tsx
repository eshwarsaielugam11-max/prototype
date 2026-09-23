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
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Calendar,
  Activity,
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
        setError('Failed to connect to the backend service. Ensure the server is running at http://localhost:8000.');
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

  const offsetStart = historyItems.length > 0 ? (page - 1) * limit + 1 : 0;
  const offsetEnd = (page - 1) * limit + historyItems.length;

  return (
    <PageContainer
      title="Screening History"
      subtitle="Chronological audit log of acoustic phonation screenings, neural risk estimations, and clinical decision support reports."
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            to="/record"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void text-xs font-body font-semibold shadow-glow-gold transition-all"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>New Recording</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchHistoryData(page, limit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-bg-panel border border-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-signal-gold' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filter & Search Bar (Flat bg-panel, hairline borders) */}
        <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-4 sm:p-5 shadow-panel">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="sm:col-span-1 lg:col-span-2 relative">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Patient ID or Session UUID..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-bg-void border border-bg-panel-border rounded text-ink placeholder:text-ink-faint focus:outline-none focus:border-signal-gold focus:ring-1 focus:ring-signal-gold font-body transition-all"
              />
            </div>

            {/* Outcome Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value as typeof filterOutcome)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-bg-void border border-bg-panel-border rounded text-ink-muted focus:text-ink focus:outline-none focus:border-signal-gold focus:ring-1 focus:ring-signal-gold font-body transition-all"
              >
                <option value="all">All Outcomes</option>
                <option value="parkinsons_risk_indicated">Filter: Risk Indicated</option>
                <option value="low_risk_indicated">Filter: Low Risk</option>
              </select>
            </div>

            {/* Modality Filter */}
            <div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                className="w-full px-3 py-2 text-xs bg-bg-void border border-bg-panel-border rounded text-ink-muted focus:text-ink focus:outline-none focus:border-signal-gold focus:ring-1 focus:ring-signal-gold font-body transition-all"
              >
                <option value="all">All Input Modalities</option>
                <option value="recording">Live Phonation Recording</option>
                <option value="upload">Audio File Upload</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display (Backend Unreachable or HTTP Error) */}
        {error && (
          <div className="p-4 rounded-lg bg-risk-elevated/10 border border-risk-elevated/40 text-ink text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-risk-elevated shrink-0 mt-0.5" />
            <div className="flex-1 font-body">
              <p className="font-semibold text-sm text-risk-elevated">Failed to Query Screening Repository</p>
              <p className="text-ink-muted mt-1 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => fetchHistoryData(page, limit)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-void border border-bg-panel-border text-xs font-semibold text-ink hover:text-signal-gold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry query
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-12 shadow-panel text-center">
            <Activity className="w-8 h-8 text-signal-gold animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink font-body">Loading Screening Records...</p>
            <p className="text-xs text-ink-muted mt-1 font-mono">Querying historical records from local SQLite repository</p>
          </div>
        )}

        {/* Empty State (Treat emptiness as direction, not mood — no decorative illustrations) */}
        {!loading && !error && filteredRecords.length === 0 && (
          <div className="bg-bg-panel rounded-lg border border-bg-panel-border p-10 sm:p-12 shadow-panel text-center max-w-lg mx-auto">
            <h3 className="text-lg font-display font-medium text-ink mb-2">
              {searchQuery || filterOutcome !== 'all' || filterSource !== 'all'
                ? 'No matching records found'
                : 'No screenings yet.'}
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mb-6 font-body leading-relaxed">
              {searchQuery || filterOutcome !== 'all' || filterSource !== 'all'
                ? 'Try adjusting your search criteria or resetting filters to view past runs.'
                : 'Perform an acoustic screening by recording live phonation (/a/) or uploading an audio file to view historical records.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {searchQuery || filterOutcome !== 'all' || filterSource !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterOutcome('all');
                    setFilterSource('all');
                  }}
                  className="px-4 py-2 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body transition-all"
                >
                  Reset Filters
                </button>
              ) : (
                <>
                  <Link
                    to="/record"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-semibold text-xs font-body shadow-glow-gold transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Live Record</span>
                  </Link>
                  <Link
                    to="/upload"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-bg-panel-elevated hover:bg-bg-panel-border text-ink font-medium text-xs font-body border border-bg-panel-border transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Upload Audio File</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Structured Table (Clarity-First, Dark Editorial Surface) */}
        {!loading && !error && filteredRecords.length > 0 && (
          <div className="bg-bg-panel rounded-lg border border-bg-panel-border shadow-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-void/60 border-b border-bg-panel-border text-[11px] font-medium text-ink-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-body">Date &amp; Time</th>
                    <th className="py-3.5 px-4 font-body">Patient / Session ID</th>
                    <th className="py-3.5 px-3 font-body">Modality</th>
                    <th className="py-3.5 px-4 font-body">Screening Outcome</th>
                    <th className="py-3.5 px-4 text-right font-body">Acoustic Score</th>
                    <th className="py-3.5 px-3 text-center font-body">Report</th>
                    <th className="py-3.5 px-4 text-right font-body">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-panel-border">
                  {filteredRecords.map((item) => {
                    const isElevated = item.prediction === 'parkinsons_risk_indicated';
                    const probPct = (item.probability * 100).toFixed(1);
                    const dateObj = new Date(item.created_at);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-bg-panel-elevated/80 transition-colors group"
                      >
                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-medium text-ink font-body">
                            <Calendar className="w-3.5 h-3.5 text-signal-gold shrink-0" />
                            <span>{dateObj.toLocaleDateString()}</span>
                          </div>
                          <div className="text-[11px] text-ink-faint font-mono ml-5.5 mt-0.5">
                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>

                        {/* Patient / Session Ref ID */}
                        <td className="py-3.5 px-4">
                          {item.test_id ? (
                            <div className="font-semibold text-ink flex items-center gap-1.5 font-mono">
                              <User className="w-3.5 h-3.5 text-signal-blue shrink-0" />
                              <span className="truncate max-w-[140px]">{item.test_id}</span>
                            </div>
                          ) : (
                            <span className="text-ink-faint font-mono">&mdash;</span>
                          )}
                          <span className="text-[10px] text-ink-faint font-mono block truncate max-w-[140px] mt-0.5" title={item.id}>
                            {item.id}
                          </span>
                        </td>

                        {/* Modality */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {item.source === 'recording' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-bg-void text-signal-gold border border-bg-panel-border font-body">
                              <Mic className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-bg-void text-ink-muted border border-bg-panel-border font-body">
                              <UploadCloud className="w-3 h-3 text-ink-faint" /> Upload
                            </span>
                          )}
                        </td>

                        {/* Screening Outcome (Strict Non-Diagnostic Language + Color + Text Badge) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isElevated ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-risk-elevated/15 text-risk-elevated border border-risk-elevated/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-risk-elevated shrink-0 animate-pulse" />
                              Risk Indicated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-risk-low/15 text-risk-low border border-risk-low/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-risk-low shrink-0" />
                              Low Risk
                            </span>
                          )}
                        </td>

                        {/* Probability Score */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isElevated ? 'text-risk-elevated' : 'text-risk-low'
                            }`}
                          >
                            {probPct}%
                          </span>
                          <span className="text-[10px] text-ink-faint block font-mono mt-0.5">
                            {item.audio_duration_sec.toFixed(1)}s
                          </span>
                        </td>

                        {/* Report Status */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {item.has_report ? (
                            <Link
                              to={`/report/${item.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-risk-low/15 text-risk-low border border-risk-low/40 hover:bg-risk-low/25 transition-colors font-body"
                              title="View Decision Support Report"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ready</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-bg-void text-ink-faint border border-bg-panel-border font-body">
                              &mdash;
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/result/${item.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-bg-void hover:bg-bg-panel-border text-ink-muted hover:text-ink text-xs font-body font-medium transition-colors border border-bg-panel-border"
                              title="Inspect Screening Result"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3 text-signal-gold" />
                            </Link>
                            {item.has_report && (
                              <Link
                                to={`/report/${item.id}`}
                                className="p-1.5 rounded bg-bg-void hover:bg-risk-low/20 text-risk-low border border-bg-panel-border transition-colors"
                                title="Open Synthesized Clinical Report"
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
            <div className="bg-bg-void/60 px-4 py-3 border-t border-bg-panel-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted font-body">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-ink font-mono">{offsetStart}</strong> &ndash; <strong className="text-ink font-mono">{offsetEnd}</strong> records
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-ink-faint text-[11px]">Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 text-xs bg-bg-void border border-bg-panel-border rounded text-ink font-mono focus:outline-none focus:border-signal-gold"
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bg-void border border-bg-panel-border text-ink-muted hover:text-ink font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-mono font-semibold text-ink">
                  Page {page}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bg-void border border-bg-panel-border text-ink-muted hover:text-ink font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer & Privacy Notice */}
        <div className="p-4 rounded bg-bg-panel/60 border border-bg-panel-border text-xs text-ink-muted flex items-start gap-2.5 font-body">
          <ShieldAlert className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-ink font-medium">Audit &amp; Privacy Notice:</strong> Raw audio waveforms are never saved to disk and are purged from memory immediately post-inference. Only mathematical attention rollouts and non-diagnostic risk scores are preserved for longitudinal review.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
