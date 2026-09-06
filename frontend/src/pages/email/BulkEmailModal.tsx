import { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchPendingCompanies,
  fetchFilterOptions,
  fetchStats,
  startBulkSend,
  pollJob,
  PendingCompany,
  BulkStats,
  JobStatus,
} from '../../services/bulkEmailService';
import { fetchPersonalInfo } from '../../services/personalInfoService';
import { generateTemplate } from '../../utils/emailTemplates';
import { TemplateType } from '../../types/personalInfo';

interface Props {
  subject: string;
  html: string;
  activeTemplate: TemplateType;
  attachments: { filename: string; content: string; contentType: string }[];
  onClose: () => void;
  onComplete: (sent: number, failed: number) => void;
}

const TEMPLATE_OPTIONS: { type: TemplateType; label: string; icon: string }[] = [
  { type: 'professional', icon: '💼', label: 'Professional' },
  { type: 'extrovert',    icon: '🚀', label: 'Extrovert'    },
];

export default function BulkEmailModal({ subject, html, activeTemplate, attachments, onClose, onComplete }: Props) {
  const [companies, setCompanies] = useState<PendingCompany[]>([]);
  const [stats, setStats] = useState<BulkStats | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Template selection inside modal
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | 'custom'>(activeTemplate);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [customHtml, setCustomHtml] = useState<string>(html);
  const [templateLoading, setTemplateLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load filter options & stats once ────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchFilterOptions(), fetchStats()])
      .then(([opts, s]) => {
        setCities(opts.cities);
        setStates(opts.states);
        setStats(s);
      })
      .catch(() => {});
  }, []);

  // ── Apply template when selection changes ────────────────────────────────────
  const applyTemplate = useCallback(async (type: TemplateType) => {
    setTemplateLoading(true);
    try {
      const info = await fetchPersonalInfo();
      setTemplateHtml(generateTemplate(type, info));
    } catch {
      setJobError('Failed to load personal info for template.');
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplate !== 'custom') {
      applyTemplate(selectedTemplate as TemplateType);
    }
  }, [selectedTemplate, applyTemplate]);

  // ── Load companies with debounced search ─────────────────────────────────────
  const loadCompanies = useCallback(() => {
    setLoading(true);
    fetchPendingCompanies({ search, city: cityFilter, state: stateFilter, isActive: activeFilter || undefined })
      .then((data) => {
        setCompanies(data);
        setSelected((prev) => {
          const ids = new Set(data.map((c) => c._id));
          return new Set([...prev].filter((id) => ids.has(id)));
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, cityFilter, stateFilter, activeFilter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadCompanies, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [loadCompanies]);

  // ── Poll job progress ────────────────────────────────────────────────────────
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null; }
  };

  const startStatsPolling = () => {
    statsTimerRef.current = setInterval(() => {
      fetchStats().then(setStats).catch(() => {});
    }, 3000);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const maxSelect = stats ? stats.remainingToday : 500;
  const allPageSelected = companies.length > 0 && companies.every((c) => selected.has(c._id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        companies.forEach((c) => next.delete(c._id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        companies.forEach((c) => {
          if (next.size < maxSelect) next.add(c._id);
        });
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxSelect) {
        next.add(id);
      }
      return next;
    });
  };

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim()) { setJobError('Please write a subject before sending.'); return; }
    const finalHtml = selectedTemplate === 'custom' ? customHtml : templateHtml;
    if (!finalHtml.trim()) { setJobError('Please select a template or write an email body first.'); return; }

    const recipients = companies
      .filter((c) => selected.has(c._id))
      .map((c) => ({ companyId: c._id, companyName: c.companyName, email: c.email }));

    if (!recipients.length) return;

    setJobError(null);
    try {
      const { jobId, total, skipped } = await startBulkSend({ recipients, subject, html: finalHtml, attachments });
      void skipped;

      setJob({ id: jobId, total, current: 0, sent: 0, failed: 0, errors: [], status: 'running', startedAt: new Date().toISOString() });

      startStatsPolling();

      pollRef.current = setInterval(async () => {
        try {
          const status = await pollJob(jobId);
          setJob(status);
          if (status.status === 'completed') {
            stopPolling();
            // Final stats refresh after completion
            fetchStats().then(setStats).catch(() => {});
            onComplete(status.sent, status.failed);
          }
        } catch { stopPolling(); }
      }, 2000);
    } catch (e: any) {
      setJobError(e?.response?.data?.message ?? 'Failed to start send job');
    }
  };

  const progress = job ? Math.round((job.current / job.total) * 100) : 0;
  const isSending = job?.status === 'running';
  const isDone = job?.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-slateate-900 shadow-2xl shadow-black/60 overflow-hidden" style={{ background: '#0f172a' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-gradient-to-r from-violet-500/10 to-cyan-500/5">
          <div>
            <h2 className="text-white font-bold text-base">Bulk Email Recipients</h2>
            <p className="text-slate-400 text-xs mt-0.5">Select companies from database — only unsent recipients shown</p>
          </div>
          <button onClick={onClose} disabled={isSending} className="text-slate-400 hover:text-white transition disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/8">
            {[
              { label: 'Pending',    value: stats.totalPending,    color: 'text-violet-400' },
              { label: 'Sent Today', value: stats.sentToday,       color: 'text-amber-400' },
              { label: 'Quota Left', value: stats.remainingToday,  color: stats.remainingToday > 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Total Sent', value: stats.totalSentEver,   color: 'text-slate-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 px-4 py-2.5 text-center">
                <p className={`font-bold text-lg ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress View */}
        {job && (
          <div className="px-5 py-4 border-b border-white/8 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                {isDone ? 'Send Complete' : 'Sending emails…'}
              </span>
              <span className="text-sm text-slate-400">{job.current}/{job.total}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-cyan-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-emerald-400">{job.sent} sent</span>
              {job.failed > 0 && <span className="text-red-400">{job.failed} failed</span>}
              {isSending && <span className="text-slate-500 animate-pulse">Sending…</span>}
            </div>
            {isDone && job.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-red-400 cursor-pointer">View {job.errors.length} errors</summary>
                <ul className="mt-1 text-[11px] text-red-300 space-y-0.5 max-h-20 overflow-y-auto">
                  {job.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Template Selector + Filters */}
        {!job && (
          <div className="px-5 py-3 border-b border-white/8 bg-black/10 space-y-2">
            {/* Template picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0">Template:</span>
              {TEMPLATE_OPTIONS.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setSelectedTemplate(t.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selectedTemplate === t.type
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/4 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                  {selectedTemplate === t.type && templateLoading && (
                    <svg className="w-3 h-3 animate-spin ml-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {selectedTemplate === t.type && !templateLoading && (
                    <svg className="w-3 h-3 text-emerald-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
              <button
                onClick={() => setSelectedTemplate('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  selectedTemplate === 'custom'
                    ? 'bg-violet-500/20 border-violet-500/50 text-white'
                    : 'bg-white/4 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                ✏️ Custom HTML
              </button>

              {attachments.length > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  📎 {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Search + City + State filters */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company…"
                className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm outline-none focus:border-violet-500/50 transition"
              />
              <select
                value={stateFilter}
                onChange={(e) => { setStateFilter(e.target.value); setCityFilter(''); }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500/50 transition"
              >
                <option value="">All States</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500/50 transition"
              >
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500/50 transition"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Custom HTML Editor */}
        {!job && selectedTemplate === 'custom' && (
          <div className="px-5 py-3 border-b border-white/8 bg-black/10">
            <p className="text-slate-400 text-xs font-semibold mb-2">✏️ Custom HTML Body</p>
            <textarea
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              placeholder="Paste or type your HTML email body here…"
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-xs font-mono outline-none focus:border-violet-500/50 transition resize-none"
            />
          </div>
        )}

        {/* Company List */}
        {!job && (
          <>
            <div className="flex items-center gap-3 px-5 py-2 border-b border-white/6 bg-black/15">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-violet-500 cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex-1">Company</span>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider w-48 hidden sm:block">Email</span>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider w-24 hidden md:block">City</span>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider w-24 hidden lg:block">State</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <svg className="w-6 h-6 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <svg className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No pending companies found</p>
                  <p className="text-xs mt-0.5">All companies with emails have been contacted</p>
                </div>
              ) : (
                companies.map((c) => {
                  const isSelected = selected.has(c._id);
                  const isDisabled = !isSelected && selected.size >= maxSelect;
                  return (
                    <label
                      key={c._id}
                      className={`flex items-center gap-3 px-5 py-2.5 border-b border-white/4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-violet-500/10' : isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => toggleOne(c._id)}
                        className="w-4 h-4 accent-violet-500 cursor-pointer shrink-0"
                      />
                      <span className="text-white text-sm flex-1 truncate">{c.companyName}</span>
                      <span className="text-slate-400 text-xs w-48 truncate hidden sm:block">{c.email}</span>
                      <span className="text-slate-500 text-xs w-24 truncate hidden md:block">{c.city || '—'}</span>
                      <span className="text-slate-500 text-xs w-24 truncate hidden lg:block">{c.state || '—'}</span>
                    </label>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 bg-black/20 flex items-center justify-between gap-3">
          {!job ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">
                  <span className="text-white font-semibold">{selected.size}</span> selected
                  {stats && <span className="text-slate-500"> / {stats.remainingToday} quota left today</span>}
                </span>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs text-slate-500 hover:text-red-400 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {jobError && (
                  <span className="text-xs text-red-400 max-w-[200px] truncate">{jobError}</span>
                )}
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={selected.size === 0 || stats?.remainingToday === 0 || templateLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send to {selected.size || '…'}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                disabled={isSending}
                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-40"
              >
                {isDone ? 'Done' : 'Running in background…'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
