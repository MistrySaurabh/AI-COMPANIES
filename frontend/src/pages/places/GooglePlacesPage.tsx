import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PlaceResult,
  savePlaces,
  startMapsSearch,
  stopMapsSearch,
  startEmailScrape,
  stopEmailScrape,
} from '../../services/placesService';
import { fetchAllActiveStates } from '../../services/stateService';
import { fetchCities } from '../../services/cityService';

interface StateOption { _id: string; name: string; code: string; }
interface CityOption  { _id: string; name: string; }
interface LogEntry    { message: string; type: 'info' | 'success' | 'error' | 'warning'; time: string; }
interface SaveSummary { saved: number; updated: number; errors: string[]; }

const LOG_COLORS: Record<string, string> = {
  info:    'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error:   'text-red-400',
};

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Auto-save banner ─────────────────────────────────────────────────────────

function SaveBanner({ saving, result, label }: { saving: boolean; result: SaveSummary | null; label: string }) {
  if (!saving && !result) return null;
  return (
    <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${
      saving
        ? 'bg-blue-50 border-blue-200'
        : result!.errors.length > 0
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-green-50 border-green-200'
    }`}>
      {saving ? (
        <>
          <Spinner className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-blue-700">{label}</span>
        </>
      ) : (
        <>
          <svg className={`w-4 h-4 shrink-0 ${result!.errors.length > 0 ? 'text-yellow-500' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {result!.saved > 0 && `${result!.saved} new compan${result!.saved !== 1 ? 'ies' : 'y'} saved`}
              {result!.saved > 0 && result!.updated > 0 && ' · '}
              {result!.updated > 0 && `${result!.updated} existing updated`}
              {result!.saved === 0 && result!.updated === 0 && 'No changes'}
              {result!.errors.length > 0 && ` · ${result!.errors.length} error(s)`}
            </p>
            {result!.errors.length > 0 && (
              <ul className="mt-0.5 space-y-0.5">
                {result!.errors.map((e, i) => <li key={i} className="text-xs text-red-600">{e}</li>)}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  place,
  emails,
  onClose,
}: {
  place: PlaceResult;
  emails: string[] | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Company Name',   value: <span className="font-semibold text-gray-900">{place.companyName}</span> },
    { label: 'Address',        value: place.address || '—' },
    { label: 'City',           value: place.city || '—' },
    { label: 'State',          value: place.state || '—' },
    { label: 'Phone',          value: place.contactNumber
        ? <a href={`tel:${place.contactNumber}`} className="text-indigo-600 hover:underline">{place.contactNumber}</a>
        : '—' },
    { label: 'Website',        value: place.website
        ? <a href={place.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{place.website}</a>
        : '—' },
    { label: 'Domain / Type',  value: place.coreServicesDomain
        ? <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">{place.coreServicesDomain}</span>
        : '—' },
    { label: 'Rating',         value: place.rating
        ? <span className="flex items-center gap-1 text-amber-500 font-semibold">{place.rating} ★</span>
        : '—' },
    { label: 'Status',         value: place.businessStatus === 'OPERATIONAL'
        ? <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">Operational</span>
        : <span className="text-gray-400 text-xs">{place.businessStatus || '—'}</span> },
    { label: 'Emails Found',   value: emails && emails.length > 0
        ? <div className="flex flex-col gap-1">{emails.map(e => <a key={e} href={`mailto:${e}`} className="text-indigo-600 hover:underline text-sm">{e}</a>)}</div>
        : <span className="text-gray-400">Not scraped / none found</span> },
    { label: 'Google Maps',    value: place.mapsUrl
        ? <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm">Open in Maps ↗</a>
        : '—' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{place.companyName}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <dl className="space-y-4">
            {rows.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-0.5">{label}</dt>
                <dd className="text-sm text-gray-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GooglePlacesPage() {
  // Form
  const [keyword,       setKeyword]       = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity,  setSelectedCity]  = useState('');

  // Dropdown data
  const [stateOptions,  setStateOptions]  = useState<StateOption[]>([]);
  const [cityOptions,   setCityOptions]   = useState<CityOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Maps scraping
  const [isSearching,  setIsSearching]  = useState(false);
  const [searchDone,   setSearchDone]   = useState(false);
  const [searchSessId, setSearchSessId] = useState<string | null>(null);
  const [logs,         setLogs]         = useState<LogEntry[]>([]);
  const [progress,     setProgress]     = useState<{ current: number; total: number } | null>(null);
  const searchEsRef = useRef<EventSource | null>(null);
  const logEndRef   = useRef<HTMLDivElement>(null);

  // Results
  const [results, setResults] = useState<PlaceResult[]>([]);

  // Detail modal
  const [modalPlace, setModalPlace] = useState<PlaceResult | null>(null);

  // Email scraping
  const [emailMap,       setEmailMap]       = useState<Map<string, string[]>>(new Map());
  const [addressMap,     setAddressMap]     = useState<Map<string, string>>(new Map());
  const [scrapingEmails, setScrapingEmails] = useState(false);
  const [emailSessId,    setEmailSessId]    = useState<string | null>(null);
  const [emailProgress,  setEmailProgress]  = useState<{ current: number; total: number; companyName: string } | null>(null);
  const [emailDone,      setEmailDone]      = useState(false);
  const emailEsRef = useRef<EventSource | null>(null);

  // Auto-save state
  const [autoSaving,          setAutoSaving]          = useState(false);
  const [autoSaveResult,      setAutoSaveResult]      = useState<SaveSummary | null>(null);
  const [emailAutoSaving,     setEmailAutoSaving]     = useState(false);
  const [emailAutoSaveResult, setEmailAutoSaveResult] = useState<SaveSummary | null>(null);

  // Auto-scroll log
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // Load states on mount
  useEffect(() => {
    setLoadingStates(true);
    fetchAllActiveStates().then(setStateOptions).catch(() => {}).finally(() => setLoadingStates(false));
  }, []);

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState) { setCityOptions([]); setSelectedCity(''); return; }
    setLoadingCities(true);
    setSelectedCity('');
    fetchCities({ stateId: selectedState, isActive: 'true', limit: 1000, sortField: 'name', sortOrder: 'asc' })
      .then((d) => setCityOptions(d.data.map((c) => ({ _id: c._id, name: c.name }))))
      .catch(() => setCityOptions([]))
      .finally(() => setLoadingCities(false));
  }, [selectedState]);

  const stateName = stateOptions.find((s) => s._id === selectedState)?.name || '';
  const cityName  = cityOptions.find((c)  => c._id === selectedCity)?.name  || '';

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs((prev) => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  // ── Core SSE search launcher ──────────────────────────────────────────────
  const launchSearch = useCallback(async () => {
    setIsSearching(true);
    setResults([]);
    setLogs([]);
    setAutoSaveResult(null);
    setEmailAutoSaveResult(null);
    setEmailMap(new Map());
    setAddressMap(new Map());
    setEmailDone(false);
    setSearchDone(false);
    setProgress(null);

    try {
      const { sessionId } = await startMapsSearch(keyword.trim(), cityName, stateName);
      setSearchSessId(sessionId);

      const es = new EventSource(`/api/places/search-stream/${sessionId}`);
      searchEsRef.current = es;

      // Collect results locally for auto-save
      const newResults: PlaceResult[] = [];

      es.addEventListener('connected', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        addLog(d.message, 'info');
      });

      es.addEventListener('log', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        addLog(d.message, d.type || 'info');
      });

      es.addEventListener('total', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setProgress({ current: 0, total: d.total });
      });

      es.addEventListener('progress', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setProgress({ current: d.current, total: d.total });
      });

      es.addEventListener('result', (e) => {
        const d: PlaceResult = JSON.parse((e as MessageEvent).data);
        setResults((prev) => [...prev, d]);
        newResults.push(d);
      });

      es.addEventListener('complete', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        addLog(`Done — scraped ${d.scraped} of ${d.total} places.`, 'success');
        setIsSearching(false);
        setSearchDone(true);
        setProgress(null);
        es.close();
        searchEsRef.current = null;

        // ── Auto-save all new results ────────────────────────────────────
        if (newResults.length > 0) {
          setAutoSaving(true);
          setAutoSaveResult(null);
          savePlaces(newResults.map((r) => ({ ...r, emails: [] })))
            .then((res) => { setAutoSaveResult(res); })
            .catch(() => { setAutoSaveResult({ saved: 0, updated: 0, errors: ['Auto-save failed'] }); })
            .finally(() => setAutoSaving(false));
        }
      });

      es.addEventListener('error', (e) => {
        if ('data' in e) {
          try { addLog(JSON.parse((e as MessageEvent).data).message, 'error'); }
          catch { addLog('Stream error', 'error'); }
        }
        setIsSearching(false);
        es.close();
        searchEsRef.current = null;
      });
    } catch {
      addLog('Failed to start search', 'error');
      setIsSearching(false);
    }
  }, [keyword, cityName, stateName, addLog]);

  const handleSearch = useCallback(() => launchSearch(), [launchSearch]);

  const handleStop = async () => {
    if (searchSessId) await stopMapsSearch(searchSessId).catch(() => {});
    searchEsRef.current?.close();
    searchEsRef.current = null;
    setIsSearching(false);
    addLog('Scraping stopped by user.', 'warning');
  };

  // ── Email scraping ────────────────────────────────────────────────────────
  const handleScrapeEmails = useCallback(async () => {
    const sites = results
      .filter((r) => r.website)
      .map((r) => ({ placeId: r.placeId, website: r.website, companyName: r.companyName }));
    if (sites.length === 0) return;

    setScrapingEmails(true);
    setEmailDone(false);
    setEmailProgress(null);
    setEmailMap(new Map());
    setAddressMap(new Map());
    setEmailAutoSaveResult(null);

    // Build local maps for auto-save at end
    const localEmailMap   = new Map<string, string[]>();
    const localAddressMap = new Map<string, string>();

    try {
      const { sessionId } = await startEmailScrape(sites);
      setEmailSessId(sessionId);

      const es = new EventSource(`/api/places/scrape-stream/${sessionId}`);
      emailEsRef.current = es;

      es.addEventListener('progress', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setEmailProgress({ current: d.current, total: d.total, companyName: d.companyName });
      });

      es.addEventListener('result', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        setEmailMap((prev) => { const n = new Map(prev); n.set(d.placeId, d.emails); return n; });
        localEmailMap.set(d.placeId, d.emails);
        if (d.address) {
          setAddressMap((prev) => { const n = new Map(prev); n.set(d.placeId, d.address); return n; });
          localAddressMap.set(d.placeId, d.address);
        }
        setEmailProgress({ current: d.current, total: d.total, companyName: d.companyName });
      });

      es.addEventListener('complete', () => {
        setScrapingEmails(false);
        setEmailDone(true);
        setEmailProgress(null);
        es.close();
        emailEsRef.current = null;

        // ── Auto-save only companies where emails were actually found ────
        const toSave = results
          .filter((r) => (localEmailMap.get(r.placeId)?.length ?? 0) > 0)
          .map((r) => ({
            ...r,
            emails: localEmailMap.get(r.placeId) || [],
            scrapedAddress: localAddressMap.get(r.placeId) || undefined,
          }));

        if (toSave.length > 0) {
          setEmailAutoSaving(true);
          savePlaces(toSave)
            .then((res) => { setEmailAutoSaveResult(res); })
            .catch(() => { setEmailAutoSaveResult({ saved: 0, updated: 0, errors: ['Email auto-save failed'] }); })
            .finally(() => setEmailAutoSaving(false));
        }
      });

      es.addEventListener('error', () => {
        setScrapingEmails(false);
        es.close();
        emailEsRef.current = null;
      });
    } catch {
      setScrapingEmails(false);
    }
  }, [results]);

  const handleStopEmail = async () => {
    if (emailSessId) await stopEmailScrape(emailSessId).catch(() => {});
    emailEsRef.current?.close();
    emailEsRef.current = null;
    setScrapingEmails(false);
    setEmailProgress(null);
  };

  const sitesWithWebsite = results.filter((r) => r.website).length;
  const isBusy           = isSearching;

  return (
    <div className="space-y-6">
      {/* Detail modal */}
      {modalPlace && (
        <DetailModal
          place={modalPlace}
          emails={emailMap.get(modalPlace.placeId)}
          onClose={() => setModalPlace(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google Maps Scraper</h1>
        <p className="text-sm text-gray-500 mt-1">
          Searches Google Maps for companies by keyword, city, and state — scrapes details and auto-saves to your Companies collection.
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Search Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Keyword <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. IT company, software company"
              disabled={isBusy}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleSearch()}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">State <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={loadingStates || isBusy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 appearance-none pr-8"
              >
                <option value="">{loadingStates ? 'Loading…' : 'Select state'}</option>
                {stateOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">City <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedState || loadingCities || isBusy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 appearance-none pr-8"
              >
                <option value="">{!selectedState ? 'Select state first' : loadingCities ? 'Loading…' : 'Select city'}</option>
                {cityOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isBusy ? (
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || !selectedState || !selectedCity}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start Scraping Google Maps
            </button>
          ) : (
            <button onClick={handleStop} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop
            </button>
          )}
          {isBusy && progress && (
            <span className="text-sm text-gray-500">Scraping… {progress.current} / {progress.total}</span>
          )}
          {isBusy && !progress && (
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner className="w-4 h-4 text-indigo-500" /> Launching browser…
            </span>
          )}

          {/* Auto-save badge */}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
            <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Auto-save enabled
          </span>
        </div>

        {isBusy && progress && progress.total > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        )}

        {/* Live log */}
        {(isBusy || logs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Log</span>
              {isBusy
                ? <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Running</span>
                : searchDone && <span className="text-xs text-indigo-600 font-medium">Complete</span>}
            </div>
            <div className="bg-gray-950 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs space-y-0.5">
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

      {/* Auto-save banners */}
      <SaveBanner
        saving={autoSaving}
        result={autoSaveResult}
        label={`Auto-saving ${results.length} compan${results.length !== 1 ? 'ies' : 'y'} to database…`}
      />
      <SaveBanner
        saving={emailAutoSaving}
        result={emailAutoSaveResult}
        label="Updating companies with scraped emails…"
      />

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="p-5 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold text-gray-800">Scraped Results</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                  {isSearching && ' · scraping…'}
                  {sitesWithWebsite > 0 && ` · ${sitesWithWebsite} with website`}
                  {emailDone && ` · ${emailMap.size} email sets scraped`}
                  {' · click a row to view details'}
                </p>
              </div>

              {/* Scrape emails */}
              {sitesWithWebsite > 0 && !isBusy && (
                scrapingEmails ? (
                  <button onClick={handleStopEmail} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    Stop Email Scrape
                  </button>
                ) : (
                  <button onClick={handleScrapeEmails} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Scrape Emails ({sitesWithWebsite} sites)
                  </button>
                )
              )}
            </div>

            {/* Email progress */}
            {scrapingEmails && emailProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <Spinner className="w-3.5 h-3.5 text-emerald-600" />
                    Scraping <span className="font-medium text-gray-700 max-w-[200px] truncate inline-block align-bottom">{emailProgress.companyName}</span>…
                  </span>
                  <span className="font-medium">{emailProgress.current} / {emailProgress.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(emailProgress.current / emailProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            {emailDone && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Email scraping complete — {emailMap.size} site{emailMap.size !== 1 ? 's' : ''} processed · emails auto-saved to database
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Company Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Address</th>
                  <th className="px-4 py-3 text-left font-semibold">Website</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Emails Found</th>
                  <th className="px-4 py-3 text-left font-semibold">Domain</th>
                  <th className="px-4 py-3 text-left font-semibold">Rating</th>
                  <th className="px-4 py-3 text-left font-semibold">Maps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, idx) => {
                  const emails     = emailMap.get(r.placeId);
                  const isScraping = scrapingEmails && emailProgress?.companyName === r.companyName;
                  return (
                    <tr
                      key={r.placeId}
                      onClick={() => setModalPlace(r)}
                      className="cursor-pointer transition hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 max-w-[150px] block truncate" title={r.companyName}>{r.companyName}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                        <span className="block truncate text-xs" title={r.address}>{r.address || '—'}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[130px]" onClick={(e) => e.stopPropagation()}>
                        {r.website
                          ? <a href={r.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 truncate block" title={r.website}>{r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.contactNumber || '—'}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {isScraping
                          ? <span className="flex items-center gap-1 text-xs text-emerald-600"><Spinner className="w-3 h-3" /> Scraping…</span>
                          : emails !== undefined
                            ? emails.length > 0
                              ? <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  {emails.slice(0, 2).map((email) => (
                                    <a key={email} href={`mailto:${email}`} className="text-xs text-indigo-600 hover:text-indigo-800 truncate block" title={email}>{email}</a>
                                  ))}
                                  {emails.length > 2 && <span className="text-xs text-gray-400">+{emails.length - 2} more</span>}
                                </div>
                              : <span className="text-xs text-gray-400">None found</span>
                            : r.website
                              ? <span className="text-xs text-gray-300">—</span>
                              : <span className="text-xs text-gray-300">No website</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.coreServicesDomain
                          ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">{r.coreServicesDomain}</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.rating || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {r.mapsUrl
                          ? <a href={r.mapsUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:text-indigo-700 transition">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer: result count */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{results.length} result{results.length !== 1 ? 's' : ''} loaded</span>
            {searchDone && results.length > 0 && (
              <span className="text-xs text-gray-400">All available results loaded</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isBusy && results.length === 0 && searchDone && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">No results found. Try a different keyword or location.</p>
        </div>
      )}
    </div>
  );
}
