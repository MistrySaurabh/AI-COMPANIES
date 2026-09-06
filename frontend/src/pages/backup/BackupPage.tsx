import { useEffect, useState, useCallback } from 'react';
import { fetchBackupInfo, downloadBackup, BackupInfo, CollectionInfo } from '../../services/backupService';

interface BackupHistoryEntry {
  timestamp: string;
  collections: string[];
  fileSize?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BackupPage() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBackupInfo();
      setInfo(data);
      setSelected(new Set(data.collections.map((c) => c.name)));
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const stored = localStorage.getItem('backup_history');
    if (stored) setHistory(JSON.parse(stored));
  }, [load]);

  function toggleCollection(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    if (!info) return;
    const all = info.collections.map((c) => c.name);
    if (selected.size === all.length) setSelected(new Set());
    else setSelected(new Set(all));
  }

  async function handleDownload() {
    if (selected.size === 0) {
      setError('Select at least one collection to export.');
      return;
    }
    setDownloading(true);
    setError('');
    setSuccess('');
    try {
      const cols = Array.from(selected);
      await downloadBackup(cols);

      const entry: BackupHistoryEntry = {
        timestamp: new Date().toISOString(),
        collections: cols,
      };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('backup_history', JSON.stringify(updated));
      setSuccess(`Backup downloaded — ${cols.length} collection(s) exported.`);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const allSelected = info ? selected.size === info.collections.length : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Backup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Export your MongoDB database as a JSON dump file.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: DB overview + collections */}
        <div className="lg:col-span-2 space-y-6">
          {/* DB Stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Database Overview
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : info ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Database', value: info.database, color: 'text-indigo-600' },
                  { label: 'Collections', value: info.totalCollections, color: 'text-purple-600' },
                  { label: 'Documents', value: info.totalDocuments.toLocaleString(), color: 'text-blue-600' },
                  { label: 'Data Size', value: formatBytes(info.dataSize), color: 'text-emerald-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Collections Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Collections
              </h2>
              {info && !loading && (
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : info ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Size</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {info.collections.map((col: CollectionInfo) => (
                    <tr
                      key={col.name}
                      onClick={() => toggleCollection(col.name)}
                      className={`cursor-pointer transition ${
                        selected.has(col.name) ? 'bg-indigo-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(col.name)}
                          onChange={() => toggleCollection(col.name)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selected.has(col.name) ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                          <span className="font-medium text-gray-800">{col.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 font-mono">
                        {col.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatBytes(col.dataSize)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatBytes(col.storageSize)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Right column: Export panel + History */}
        <div className="space-y-6">
          {/* Export Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </h2>

            {/* Format badge */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Format</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 w-fit">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-indigo-700">JSON</span>
              </div>
            </div>

            {/* Selection summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 mb-1">Selected</p>
              <p className="text-sm font-semibold text-gray-800">
                {selected.size} / {info?.collections.length ?? '—'} collections
              </p>
              {info && selected.size > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  ~{formatBytes(
                    info.collections
                      .filter((c) => selected.has(c.name))
                      .reduce((s, c) => s + c.dataSize, 0)
                  )} estimated
                </p>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading || loading || selected.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Backup
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Exports selected collections as a single JSON file. All documents are included.
            </p>
          </div>

          {/* Backup History */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Backup History
              </h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('backup_history');
                  }}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-xs text-gray-400">No backups yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700">{formatDate(entry.timestamp)}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {entry.collections.length} collection{entry.collections.length !== 1 ? 's' : ''}
                        {' — '}
                        {entry.collections.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
