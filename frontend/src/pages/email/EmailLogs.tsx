import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchEmailLogs, deleteEmailLog, clearEmailLogs, EmailLog, EmailLogFilters } from '../../services/emailLogService';
import Pagination from '../../components/Pagination';

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState<'' | 'sent' | 'failed' | 'all'>('');
  const [clearing, setClearing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const [filters, setFilters] = useState<EmailLogFilters>({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 25,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEmailLogs(filters);
      setLogs(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    await deleteEmailLog(id);
    setDeleteId(null);
    load();
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const status = clearConfirm === 'all' ? undefined : clearConfirm as 'sent' | 'failed';
      await clearEmailLogs(status);
      setClearConfirm('');
      load();
    } finally {
      setClearing(false);
    }
  };

  const hasFilters = filters.status || filters.search || filters.dateFrom || filters.dateTo;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Logs</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setClearConfirm('failed')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
          >
            Clear Failed
          </button>
          <button
            onClick={() => setClearConfirm('sent')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
          >
            Clear Sent
          </button>
          <button
            onClick={() => setClearConfirm('all')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-800 text-white hover:bg-gray-900 transition"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search company or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as EmailLogFilters['status'], page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title="From date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title="To date"
          />
          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput('');
                setFilters((prev) => ({ ...prev, status: '', search: '', dateFrom: '', dateTo: '', page: 1 }));
              }}
              className="text-sm text-gray-500 hover:text-red-500 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sent At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[180px] truncate" title={log.companyName}>
                      {log.companyName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={log.recipientEmail}>
                      <a href={`mailto:${log.recipientEmail}`} className="text-indigo-600 hover:underline">
                        {log.recipientEmail}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {log.status === 'sent' ? (
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {log.status === 'sent' ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px]">
                      {log.errorMessage ? (
                        <button
                          onClick={() => setExpandedError(expandedError === log._id ? null : log._id)}
                          className="text-red-500 hover:text-red-700 text-left truncate block max-w-full"
                          title={log.errorMessage}
                        >
                          {expandedError === log._id ? log.errorMessage : `${log.errorMessage.slice(0, 40)}${log.errorMessage.length > 40 ? '…' : ''}`}
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteId(log._id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            limit={filters.limit}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
            onLimitChange={(l) => setFilters((prev) => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Log</h3>
            <p className="text-sm text-gray-600 mb-6">Remove this email log entry? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm modal */}
      {clearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Clear {clearConfirm === 'all' ? 'All' : clearConfirm === 'sent' ? 'Sent' : 'Failed'} Logs
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete{' '}
              {clearConfirm === 'all' ? 'all email logs' : `all ${clearConfirm} logs`}. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setClearConfirm('')} disabled={clearing} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleClear} disabled={clearing} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60">
                {clearing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Clearing…
                  </>
                ) : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
