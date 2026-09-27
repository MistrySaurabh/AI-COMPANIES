import { useState, useRef, useEffect, useCallback } from 'react';
import { startScrape, stopScrape, fetchScrapedCompanies, fetchScrapedCompanyFilterOptions, deleteScrapedCompany, bulkDeleteScrapedCompanies, bulkSyncScrapedCompanies, startRescrapeDetails, startFillCityState, cleanBadWebsiteUrls, syncScrapedCompanyToCompany, startPlacesEnrich, startWebsiteEmailScrape } from '../../services/scraperService';
import { ScrapedCompany, ScrapeStats, LogEntry } from '../../types/scraper';

const DEFAULT_URL =
  'https://www.naukri.com/companies-hiring-in-india?src=gnbCompanies_homepage_srch&title=IT%20Companies%20Hiring&categoryId=116&pageNo=1&qccompanyIndustry=105&qccompanyIndustry=107&qccompanyIndustry=108&qccompanyIndustry=109&qccompanyIndustry=110';

const LOG_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  skip: 'text-gray-500',
};

// ─── Company Detail Modal ──────────────────────────────────────────────────────

function CompanyModal({ company, onClose }: { company: ScrapedCompany; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const infoRows: { label: string; value: string | number | null }[] = [
    { label: 'Job Title', value: company.jobTitle || null },
    { label: 'Work Mode', value: company.isRemote ? 'Remote' : null },
    { label: 'Industry', value: company.industry || null },
    { label: 'Company Size', value: company.companySize || null },
    { label: 'Headquarters', value: company.headquarters || null },
    { label: 'City', value: company.city || null },
    { label: 'State', value: company.state || null },
    { label: 'Founded', value: company.foundedYear || null },
    { label: 'Company Type', value: company.companyType || null },
    { label: 'Active Jobs', value: company.activeJobs },
    { label: 'Rating', value: company.rating ? `${company.rating} / 5` : null },
    { label: 'Reviews', value: company.totalReviews || null },
    { label: 'Source', value: company.sourceWebsite },
    { label: 'Scraped On', value: new Date(company.scrapedAt).toLocaleString() },
  ].filter((r) => r.value !== null && r.value !== '' && r.value !== undefined);

  const socialIcons: Record<string, JSX.Element> = {
    linkedin: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    twitter: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    facebook: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
          {company.logo && (
            <img
              src={company.logo}
              alt={company.companyName}
              className="w-14 h-14 rounded-lg object-contain border border-gray-200 p-1 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{company.companyName}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {company.rating && (
                <span className="flex items-center gap-1 text-amber-500 font-semibold text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {company.rating.toFixed(1)}
                </span>
              )}
              {company.totalReviews && (
                <span className="text-xs text-gray-500">{company.totalReviews} reviews</span>
              )}
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                {company.sourceWebsite}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Description */}
          {company.description && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">About</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {company.description}
              </p>
            </div>
          )}

          {/* Key Info Grid */}
          {infoRows.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Company Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {infoRows.map((row) => (
                  <div key={row.label} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="text-xs text-gray-400 font-medium mb-0.5">{row.label}</div>
                    <div className="text-sm font-semibold text-gray-800">{String(row.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address from website */}
          {company.address && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Address (from Website)</h3>
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed">
                {company.address}
              </div>
            </div>
          )}

          {/* Emails */}
          {((company.emails ?? []).length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Email Addresses</h3>
              <div className="flex flex-col gap-2">
                {(company.emails ?? []).map((email) => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {email}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contact Numbers */}
          {((company.contactNumbers ?? []).length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact Numbers</h3>
              <div className="flex flex-col gap-2">
                {(company.contactNumbers ?? []).map((num) => (
                  <a
                    key={num}
                    href={`tel:${num.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition"
                  >
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {num}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(() => {
            // For Naukri-sourced companies the social links found on the page
            // belong to Naukri itself (footer), not the company — exclude them.
            const naukriSocialBlacklist = ['facebook', 'instagram', 'twitter', 'linkedin'];
            const visibleSocialLinks = Object.entries(company.socialLinks ?? {}).filter(
              ([platform]) => company.sourceWebsite !== 'naukri' || !naukriSocialBlacklist.includes(platform)
            );
            const hasLinks = company.website || company.companyProfileUrl || visibleSocialLinks.length > 0;
            if (!hasLinks) return null;
            return (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Links</h3>
              <div className="flex flex-wrap gap-2">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
                {company.companyProfileUrl && (
                  <a
                    href={company.companyProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Naukri Profile
                  </a>
                )}
                {visibleSocialLinks.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition capitalize"
                  >
                    {socialIcons[platform] || null}
                    {platform}
                  </a>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ScraperPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<ScrapeStats>({
    pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  // Table state
  const [companies, setCompanies] = useState<ScrapedCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState<{ cities: string[]; states: string[] }>({ cities: [], states: [] });
  const [tableLoading, setTableLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [selectedCompany, setSelectedCompany] = useState<ScrapedCompany | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [cleaningWebsites, setCleaningWebsites] = useState(false);

  // Sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Re-scrape details state
  const [rescrapeMode, setRescrapeMode] = useState<'missing' | 'all'>('missing');
  const [rescrapeRunning, setRescrapeRunning] = useState(false);
  const [rescrapeSessionId, setRescrapeSessionId] = useState<string | null>(null);
  const [rescrapeLogs, setRescrapeLogs] = useState<LogEntry[]>([]);
  const [rescrapeStats, setRescrapeStats] = useState<ScrapeStats>({
    pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0,
  });
  const [rescrapeComplete, setRescrapeComplete] = useState(false);
  const rescrapeLogEndRef = useRef<HTMLDivElement>(null);
  const rescrapeEsRef = useRef<EventSource | null>(null);

  // Fill city/state state
  const [fillRunning, setFillRunning] = useState(false);
  const [fillSessionId, setFillSessionId] = useState<string | null>(null);
  const [fillLogs, setFillLogs] = useState<LogEntry[]>([]);
  const [fillStats, setFillStats] = useState<ScrapeStats>({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
  const [fillComplete, setFillComplete] = useState(false);
  const fillLogEndRef = useRef<HTMLDivElement>(null);
  const fillEsRef = useRef<EventSource | null>(null);

  // Places enrich state
  const [enrichMode, setEnrichMode] = useState<'missing' | 'all'>('missing');
  const [enrichRunning, setEnrichRunning] = useState(false);
  const [enrichSessionId, setEnrichSessionId] = useState<string | null>(null);
  const [enrichLogs, setEnrichLogs] = useState<LogEntry[]>([]);
  const [enrichStats, setEnrichStats] = useState<ScrapeStats>({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
  const [enrichComplete, setEnrichComplete] = useState(false);
  const enrichLogEndRef = useRef<HTMLDivElement>(null);
  const enrichEsRef = useRef<EventSource | null>(null);

  // Website email scan state
  const [emailScanMode, setEmailScanMode] = useState<'missing' | 'all'>('missing');
  const [emailScanRunning, setEmailScanRunning] = useState(false);
  const [emailScanSessionId, setEmailScanSessionId] = useState<string | null>(null);
  const [emailScanLogs, setEmailScanLogs] = useState<LogEntry[]>([]);
  const [emailScanStats, setEmailScanStats] = useState<ScrapeStats>({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
  const [emailScanComplete, setEmailScanComplete] = useState(false);
  const emailScanLogEndRef = useRef<HTMLDivElement>(null);
  const emailScanEsRef = useRef<EventSource | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, 'time'>) => {
    setLogs((prev) => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    rescrapeLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rescrapeLogs]);

  useEffect(() => {
    fillLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [fillLogs]);

  useEffect(() => {
    enrichLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [enrichLogs]);

  useEffect(() => {
    emailScanLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [emailScanLogs]);

  const loadCompanies = useCallback(async () => {
    setTableLoading(true);
    try {
      const data = await fetchScrapedCompanies({
        page, limit,
        search: search || undefined,
        sourceWebsite: sourceFilter === 'remote' ? undefined : (sourceFilter || undefined),
        city: cityFilter || undefined,
        state: stateFilter || undefined,
        isRemote: sourceFilter === 'remote' ? 'true' : undefined,
      });
      setCompanies(data.companies);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    finally { setTableLoading(false); }
  }, [page, limit, search, sourceFilter, cityFilter, stateFilter]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  useEffect(() => {
    fetchScrapedCompanyFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!url.trim()) return;
    setLogs([]);
    setStats({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
    setIsComplete(false);
    setIsRunning(true);

    try {
      const { sessionId: sid } = await startScrape(url.trim());
      setSessionId(sid);

      const es = new EventSource(`/api/scraper/stream/${sid}`);
      esRef.current = es;

      es.addEventListener('connected', () => addLog({ message: 'Connected to scrape stream.', type: 'info' }));

      es.addEventListener('log', (e) => {
        const d = JSON.parse(e.data);
        addLog({ message: d.message, type: d.type || 'info' });
      });

      es.addEventListener('progress', (e) => {
        setStats(JSON.parse(e.data));
      });

      es.addEventListener('complete', (e) => {
        const d = JSON.parse(e.data);
        setStats(d);
        addLog({ message: d.message, type: 'success' });
        setIsComplete(true);
        setIsRunning(false);
        es.close();
        esRef.current = null;
        loadCompanies();
        fetchScrapedCompanyFilterOptions().then(setFilterOptions).catch(() => {});
      });

      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addLog({ message: `Error: ${JSON.parse((e as MessageEvent).data).message}`, type: 'error' }); }
          catch { addLog({ message: 'Stream error.', type: 'error' }); }
        }
        setIsRunning(false);
        es.close();
        esRef.current = null;
      });

    } catch (err: unknown) {
      addLog({ message: err instanceof Error ? err.message : 'Failed to start', type: 'error' });
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (sessionId) {
      await stopScrape(sessionId).catch(() => {});
      esRef.current?.close();
      esRef.current = null;
    }
    setIsRunning(false);
    addLog({ message: 'Scrape stopped by user.', type: 'warning' });
  };

  const handleRescrapeStart = async () => {
    setRescrapeLogs([]);
    setRescrapeStats({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
    setRescrapeComplete(false);
    setRescrapeRunning(true);

    const addRescrapeLog = (entry: Omit<LogEntry, 'time'>) =>
      setRescrapeLogs((prev) => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);

    try {
      const { sessionId: sid } = await startRescrapeDetails(rescrapeMode);
      setRescrapeSessionId(sid);

      const es = new EventSource(`/api/scraper/stream/${sid}`);
      rescrapeEsRef.current = es;

      es.addEventListener('connected', () =>
        addRescrapeLog({ message: 'Connected — starting detail scrape…', type: 'info' })
      );

      es.addEventListener('log', (e) => {
        const d = JSON.parse(e.data);
        addRescrapeLog({ message: d.message, type: d.type || 'info' });
      });

      es.addEventListener('progress', (e) => {
        setRescrapeStats(JSON.parse(e.data));
      });

      es.addEventListener('complete', (e) => {
        const d = JSON.parse(e.data);
        setRescrapeStats(d);
        addRescrapeLog({ message: d.message, type: 'success' });
        setRescrapeComplete(true);
        setRescrapeRunning(false);
        es.close();
        rescrapeEsRef.current = null;
        loadCompanies();
      });

      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addRescrapeLog({ message: `Error: ${JSON.parse((e as MessageEvent).data).message}`, type: 'error' }); }
          catch { addRescrapeLog({ message: 'Stream error.', type: 'error' }); }
        }
        setRescrapeRunning(false);
        es.close();
        rescrapeEsRef.current = null;
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start re-scrape';
      setRescrapeLogs([{ message: msg, type: 'error', time: new Date().toLocaleTimeString() }]);
      setRescrapeRunning(false);
    }
  };

  const handleRescrapeStop = async () => {
    if (rescrapeSessionId) {
      await stopScrape(rescrapeSessionId).catch(() => {});
      rescrapeEsRef.current?.close();
      rescrapeEsRef.current = null;
    }
    setRescrapeRunning(false);
    setRescrapeLogs((prev) => [
      ...prev,
      { message: 'Stopped by user.', type: 'warning', time: new Date().toLocaleTimeString() },
    ]);
  };

  const handleCleanWebsites = async () => {
    setCleaningWebsites(true);
    try {
      const { updated } = await cleanBadWebsiteUrls();
      loadCompanies();
      alert(`Cleaned ${updated} bad website URL${updated !== 1 ? 's' : ''}.`);
    } finally { setCleaningWebsites(false); }
  };

  const handleFillStart = async () => {
    setFillLogs([]);
    setFillStats({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
    setFillComplete(false);
    setFillRunning(true);

    const addFillLog = (entry: Omit<LogEntry, 'time'>) =>
      setFillLogs((prev) => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);

    try {
      const { sessionId: sid } = await startFillCityState();
      setFillSessionId(sid);

      const es = new EventSource(`/api/scraper/stream/${sid}`);
      fillEsRef.current = es;

      es.addEventListener('connected', () => addFillLog({ message: 'Connected — scanning descriptions…', type: 'info' }));
      es.addEventListener('log', (e) => { const d = JSON.parse(e.data); addFillLog({ message: d.message, type: d.type || 'info' }); });
      es.addEventListener('progress', (e) => { setFillStats(JSON.parse(e.data)); });
      es.addEventListener('complete', (e) => {
        const d = JSON.parse(e.data);
        setFillStats(d);
        addFillLog({ message: d.message, type: 'success' });
        setFillComplete(true);
        setFillRunning(false);
        es.close();
        fillEsRef.current = null;
        loadCompanies();
        fetchScrapedCompanyFilterOptions().then(setFilterOptions).catch(() => {});
      });
      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addFillLog({ message: `Error: ${JSON.parse((e as MessageEvent).data).message}`, type: 'error' }); }
          catch { addFillLog({ message: 'Stream error.', type: 'error' }); }
        }
        setFillRunning(false);
        es.close();
        fillEsRef.current = null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start';
      setFillLogs([{ message: msg, type: 'error', time: new Date().toLocaleTimeString() }]);
      setFillRunning(false);
    }
  };

  const handleFillStop = async () => {
    if (fillSessionId) {
      await stopScrape(fillSessionId).catch(() => {});
      fillEsRef.current?.close();
      fillEsRef.current = null;
    }
    setFillRunning(false);
    setFillLogs((prev) => [...prev, { message: 'Stopped by user.', type: 'warning', time: new Date().toLocaleTimeString() }]);
  };

  const handleEnrichStart = async () => {
    setEnrichLogs([]);
    setEnrichStats({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
    setEnrichComplete(false);
    setEnrichRunning(true);

    const addEnrichLog = (entry: Omit<LogEntry, 'time'>) =>
      setEnrichLogs((prev) => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);

    try {
      const { sessionId: sid } = await startPlacesEnrich(enrichMode);
      setEnrichSessionId(sid);

      const es = new EventSource(`/api/scraper/stream/${sid}`);
      enrichEsRef.current = es;

      es.addEventListener('connected', () => addEnrichLog({ message: 'Connected — launching browser…', type: 'info' }));
      es.addEventListener('log', (e) => { const d = JSON.parse(e.data); addEnrichLog({ message: d.message, type: d.type || 'info' }); });
      es.addEventListener('progress', (e) => { setEnrichStats(JSON.parse(e.data)); });
      es.addEventListener('complete', (e) => {
        const d = JSON.parse(e.data);
        setEnrichStats(d);
        addEnrichLog({ message: d.message || 'Complete.', type: 'success' });
        setEnrichComplete(true);
        setEnrichRunning(false);
        es.close();
        enrichEsRef.current = null;
        loadCompanies();
      });
      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addEnrichLog({ message: `Error: ${JSON.parse((e as MessageEvent).data).message}`, type: 'error' }); }
          catch { addEnrichLog({ message: 'Stream error.', type: 'error' }); }
        }
        setEnrichRunning(false);
        es.close();
        enrichEsRef.current = null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start';
      setEnrichLogs([{ message: msg, type: 'error', time: new Date().toLocaleTimeString() }]);
      setEnrichRunning(false);
    }
  };

  const handleEnrichStop = async () => {
    if (enrichSessionId) {
      await stopScrape(enrichSessionId).catch(() => {});
      enrichEsRef.current?.close();
      enrichEsRef.current = null;
    }
    setEnrichRunning(false);
    setEnrichLogs((prev) => [...prev, { message: 'Stopped by user.', type: 'warning', time: new Date().toLocaleTimeString() }]);
  };

  const handleEmailScanStart = async () => {
    setEmailScanLogs([]);
    setEmailScanStats({ pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 });
    setEmailScanComplete(false);
    setEmailScanRunning(true);

    const addLog = (entry: Omit<LogEntry, 'time'>) =>
      setEmailScanLogs((prev) => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);

    try {
      const { sessionId: sid } = await startWebsiteEmailScrape(emailScanMode);
      setEmailScanSessionId(sid);

      const es = new EventSource(`/api/scraper/stream/${sid}`);
      emailScanEsRef.current = es;

      es.addEventListener('connected', () => addLog({ message: 'Connected — launching browser…', type: 'info' }));
      es.addEventListener('log', (e) => { const d = JSON.parse(e.data); addLog({ message: d.message, type: d.type || 'info' }); });
      es.addEventListener('progress', (e) => { setEmailScanStats(JSON.parse(e.data)); });
      es.addEventListener('complete', (e) => {
        const d = JSON.parse(e.data);
        setEmailScanStats(d);
        addLog({ message: d.message || 'Complete.', type: 'success' });
        setEmailScanComplete(true);
        setEmailScanRunning(false);
        es.close();
        emailScanEsRef.current = null;
        loadCompanies();
      });
      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addLog({ message: `Error: ${JSON.parse((e as MessageEvent).data).message}`, type: 'error' }); }
          catch { addLog({ message: 'Stream error.', type: 'error' }); }
        }
        setEmailScanRunning(false);
        es.close();
        emailScanEsRef.current = null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start';
      setEmailScanLogs([{ message: msg, type: 'error', time: new Date().toLocaleTimeString() }]);
      setEmailScanRunning(false);
    }
  };

  const handleEmailScanStop = async () => {
    if (emailScanSessionId) {
      await stopScrape(emailScanSessionId).catch(() => {});
      emailScanEsRef.current?.close();
      emailScanEsRef.current = null;
    }
    setEmailScanRunning(false);
    setEmailScanLogs((prev) => [...prev, { message: 'Stopped by user.', type: 'warning', time: new Date().toLocaleTimeString() }]);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteScrapedCompany(id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadCompanies();
    } finally { setDeletingId(null); }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map(c => c._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteScrapedCompanies(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadCompanies();
    } finally { setBulkDeleting(false); }
  };

  const handleBulkSync = async () => {
    if (selectedIds.size === 0) return;
    setBulkSyncing(true);
    try {
      await bulkSyncScrapedCompanies(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadCompanies();
    } finally { setBulkSyncing(false); }
  };

  const handleSync = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingId(id);
    try {
      await syncScrapedCompanyToCompany(id);
      loadCompanies();
    } finally { setSyncingId(null); }
  };

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, search, sourceFilter, cityFilter, stateFilter]);

  return (
    <div className="space-y-6">
      {/* Modal */}
      {selectedCompany && (
        <CompanyModal company={selectedCompany} onClose={() => setSelectedCompany(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scraper</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scrape company data from Naukri, Hirist, Glassdoor (company listings) or Naukri remote job listings.
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Scrape Configuration</h2>

        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
            placeholder="Paste Naukri / Hirist / Glassdoor URL…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
          />
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!url.trim()}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Scrape
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {/* Stats */}
        {(isRunning || isComplete || stats.companiesFound > 0) && (
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Pages', value: stats.pagesScraped, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Found', value: stats.companiesFound, color: 'bg-blue-50 text-blue-700' },
              { label: 'Saved', value: stats.companiesSaved, color: 'bg-green-50 text-green-700' },
              { label: 'Skipped', value: stats.companiesSkipped, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Errors', value: stats.errors, color: 'bg-red-50 text-red-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live Log */}
        {(isRunning || logs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Log</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Running
                </span>
              )}
              {isComplete && (
                <span className="text-xs text-indigo-600 font-medium">Complete</span>
              )}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-gray-600">Waiting…</span>}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Re-scrape Details Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-800">Re-scrape Details for Existing Companies</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Visit each stored company's profile URL and update details (description, industry, size, website, etc.).
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={rescrapeMode}
              onChange={(e) => setRescrapeMode(e.target.value as 'missing' | 'all')}
              disabled={rescrapeRunning}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="missing">Missing details only</option>
              <option value="all">All companies (overwrite)</option>
            </select>
            {!rescrapeRunning ? (
              <button
                onClick={handleRescrapeStart}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Scrape Details
              </button>
            ) : (
              <button
                onClick={handleRescrapeStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Re-scrape Stats */}
        {(rescrapeRunning || rescrapeComplete || rescrapeStats.companiesFound > 0) && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Found', value: rescrapeStats.companiesFound, color: 'bg-blue-50 text-blue-700' },
              { label: 'Updated', value: rescrapeStats.companiesSaved, color: 'bg-green-50 text-green-700' },
              { label: 'Current', value: rescrapeStats.currentPage ?? 0, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Errors', value: rescrapeStats.errors, color: 'bg-red-50 text-red-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Re-scrape Live Log */}
        {(rescrapeRunning || rescrapeLogs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail Scrape Log</span>
              {rescrapeRunning && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Running
                </span>
              )}
              {rescrapeComplete && (
                <span className="text-xs text-emerald-600 font-medium">Complete</span>
              )}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {rescrapeLogs.map((log, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.message}</span>
                </div>
              ))}
              {rescrapeLogs.length === 0 && <span className="text-gray-600">Waiting…</span>}
              <div ref={rescrapeLogEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Fill City/State from Description Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-800">Fill City &amp; State from Description</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              For companies missing city/state, scans description, headquarters &amp; address for known city names and fills state from the database.
            </p>
          </div>
          <div className="shrink-0">
            {!fillRunning ? (
              <button
                onClick={handleFillStart}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fill City &amp; State
              </button>
            ) : (
              <button
                onClick={handleFillStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {(fillRunning || fillComplete || fillStats.companiesFound > 0) && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Found', value: fillStats.companiesFound, color: 'bg-blue-50 text-blue-700' },
              { label: 'Updated', value: fillStats.companiesSaved, color: 'bg-green-50 text-green-700' },
              { label: 'Skipped', value: fillStats.companiesSkipped, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Errors', value: fillStats.errors, color: 'bg-red-50 text-red-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        {(fillRunning || fillLogs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fill Log</span>
              {fillRunning && (
                <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /> Running
                </span>
              )}
              {fillComplete && <span className="text-xs text-violet-600 font-medium">Complete</span>}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {fillLogs.map((log, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.message}</span>
                </div>
              ))}
              {fillLogs.length === 0 && <span className="text-gray-600">Waiting…</span>}
              <div ref={fillLogEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Google Places Enrichment Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-800">Enrich from Google Places</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              For each scraped company, search Google Maps and fetch phone number, address, website &amp; rating — then store back into the database.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={enrichMode}
              onChange={(e) => setEnrichMode(e.target.value as 'missing' | 'all')}
              disabled={enrichRunning}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="missing">Missing phone only</option>
              <option value="all">All companies (overwrite)</option>
            </select>
            {!enrichRunning ? (
              <button
                onClick={handleEnrichStart}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Enrich from Maps
              </button>
            ) : (
              <button
                onClick={handleEnrichStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {(enrichRunning || enrichComplete || enrichStats.companiesFound > 0) && (
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: enrichStats.companiesFound, color: 'bg-blue-50 text-blue-700' },
              { label: 'Current', value: enrichStats.currentPage ?? 0, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Enriched', value: enrichStats.companiesSaved, color: 'bg-green-50 text-green-700' },
              { label: 'Skipped', value: enrichStats.companiesSkipped, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Errors', value: enrichStats.errors, color: 'bg-red-50 text-red-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        {(enrichRunning || enrichLogs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrich Log</span>
              {enrichRunning && (
                <span className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> Running
                </span>
              )}
              {enrichComplete && <span className="text-xs text-teal-600 font-medium">Complete</span>}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {enrichLogs.map((log, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.message}</span>
                </div>
              ))}
              {enrichLogs.length === 0 && <span className="text-gray-600">Waiting…</span>}
              <div ref={enrichLogEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Website Email Scan Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-800">Scan Websites for Emails</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              For each scraped company with a website, visits the homepage and Contact / About pages to extract email addresses, then saves them to the database.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={emailScanMode}
              onChange={(e) => setEmailScanMode(e.target.value as 'missing' | 'all')}
              disabled={emailScanRunning}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="missing">Missing emails only</option>
              <option value="all">All companies with website</option>
            </select>
            {!emailScanRunning ? (
              <button
                onClick={handleEmailScanStart}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Scan for Emails
              </button>
            ) : (
              <button
                onClick={handleEmailScanStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {(emailScanRunning || emailScanComplete || emailScanStats.companiesFound > 0) && (
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: emailScanStats.companiesFound, color: 'bg-blue-50 text-blue-700' },
              { label: 'Current', value: emailScanStats.currentPage ?? 0, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Updated', value: emailScanStats.companiesSaved, color: 'bg-green-50 text-green-700' },
              { label: 'No Email', value: emailScanStats.companiesSkipped, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Errors', value: emailScanStats.errors, color: 'bg-red-50 text-red-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        {(emailScanRunning || emailScanLogs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Scan Log</span>
              {emailScanRunning && (
                <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Running
                </span>
              )}
              {emailScanComplete && <span className="text-xs text-blue-600 font-medium">Complete</span>}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {emailScanLogs.map((log, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.message}</span>
                </div>
              ))}
              {emailScanLogs.length === 0 && <span className="text-gray-600">Waiting…</span>}
              <div ref={emailScanLogEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Scraped Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-800">Scraped Companies</h2>
            <p className="text-xs text-gray-400 mt-0.5">{total} total · click a row to view details</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Bulk delete bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium text-gray-700">{selectedIds.size} selected</span>
                <span className="w-px h-4 bg-gray-300" />
                <button
                  onClick={handleBulkSync}
                  disabled={bulkSyncing || bulkDeleting}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {bulkSyncing ? 'Syncing…' : 'Sync Selected'}
                </button>
                <span className="w-px h-4 bg-gray-300" />
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting || bulkSyncing}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {bulkDeleting ? 'Deleting…' : 'Delete Selected'}
                </button>
                <span className="w-px h-4 bg-gray-300" />
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  ✕ Clear
                </button>
              </div>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
            />
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Cities</option>
              {filterOptions.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All States</option>
              {filterOptions.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sources</option>
              <option value="remote">Remote Companies</option>
              <option value="naukri">Naukri (Companies)</option>
              <option value="naukri-jobs">Naukri (Remote Jobs)</option>
              <option value="hirist">Hirist</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="other">Other</option>
            </select>
            <button
              onClick={handleCleanWebsites}
              disabled={cleaningWebsites}
              className="px-3 py-1.5 border border-orange-300 text-orange-600 rounded-lg text-sm hover:bg-orange-50 disabled:opacity-50 transition whitespace-nowrap"
              title="Set website to blank for known job-portal URLs (naukritalentcloud.com, naukri.com, etc.)"
            >
              {cleaningWebsites ? 'Cleaning…' : 'Clean Bad URLs'}
            </button>
            <button
              onClick={loadCompanies}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No scraped companies yet. Start a scrape above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pl-4 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={companies.length > 0 && selectedIds.size === companies.length}
                      ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < companies.length; }}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Role / Industry</th>
                  <th className="px-4 py-3 text-left font-semibold">Size</th>
                  <th className="px-4 py-3 text-left font-semibold">HQ</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                  <th className="px-4 py-3 text-left font-semibold">State</th>
                  <th className="px-4 py-3 text-left font-semibold">Rating</th>
                  <th className="px-4 py-3 text-left font-semibold">Jobs</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="px-4 py-3 text-left font-semibold">Scraped</th>
                  <th className="px-4 py-3 text-left font-semibold">Synced</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => setSelectedCompany(c)}
                    className={`hover:bg-indigo-50/40 cursor-pointer transition ${selectedIds.has(c._id) ? 'bg-indigo-50/60' : ''}`}
                  >
                    <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c._id)}
                        onChange={() => {}}
                        onClick={(e) => toggleSelect(c._id, e)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.logo && (
                          <img
                            src={c.logo}
                            alt=""
                            className="w-7 h-7 rounded object-contain border border-gray-100 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="font-medium text-gray-900 truncate max-w-[150px]" title={c.companyName}>
                              {c.companyName}
                            </div>
                            {c.isRemote && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 leading-none">
                                REMOTE
                              </span>
                            )}
                          </div>
                          {c.website && (
                            <div className="text-xs text-indigo-500 truncate max-w-[160px]">
                              {c.website.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px]" title={c.jobTitle || c.industry}>
                      {c.jobTitle ? (
                        <span className="truncate block text-xs text-violet-700 font-medium" title={c.jobTitle}>
                          {c.jobTitle}
                        </span>
                      ) : (c.industry || '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.companySize || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={c.headquarters}>
                      {c.headquarters || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate" title={c.city}>
                      {c.city || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate" title={c.state}>
                      {c.state || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.rating ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {c.rating.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.activeJobs ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        c.sourceWebsite === 'naukri-jobs'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {c.sourceWebsite === 'naukri-jobs' ? 'naukri jobs' : c.sourceWebsite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.scrapedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {c.syncedToCompany ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Synced
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleSync(c._id, e)}
                          disabled={syncingId === c._id}
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition whitespace-nowrap"
                          title="Sync to Companies table"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {syncingId === c._id ? 'Syncing…' : 'Sync'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => handleDelete(c._id, e)}
                        disabled={deletingId === c._id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 transition"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {(totalPages > 1 || total > 0) && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span>Page {page} of {totalPages} ({total} records)</span>
              <span className="text-gray-300">|</span>
              <label className="text-xs text-gray-500">Rows:</label>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[15, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
              >Prev</button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
