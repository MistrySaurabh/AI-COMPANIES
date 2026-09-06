import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Company, CompanyFilters } from '../../types/company';
import { fetchCompanies, deleteCompany, bulkDeleteCompanies, fetchFilterOptions, importCompanies, toggleCompanyActive, ImportResult, CityOption } from '../../services/companyService';
import Pagination from '../../components/Pagination';

type SortKey = 'companyName' | 'city' | 'state' | 'hrEmail' | 'createdAt';

export default function CompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [allCities, setAllCities] = useState<CityOption[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Bulk selection state ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    city: '',
    state: '',
    isActive: '',
    sortField: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });

  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompanies(filters);
      setCompanies(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Clear selection when page/filters change
  useEffect(() => { setSelected(new Set()); }, [filters]);

  useEffect(() => {
    fetchFilterOptions().then((opts) => {
      setAllCities(opts.cities);
      setStateOptions(opts.states);
    });
  }, []);

  const cityOptions = filters.state
    ? allCities.filter((c) => c.stateName === filters.state)
    : allCities;

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSort = (field: SortKey) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (filters.sortField !== field) return <span className="text-gray-300 ml-1">⇅</span>;
    return <span className="text-indigo-600 ml-1">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Checkbox helpers ──
  const allPageIds = companies.map((c) => c._id);
  const allChecked = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const someChecked = allPageIds.some((id) => selected.has(id)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...allPageIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await bulkDeleteCompanies([...selected]);
      setSelected(new Set());
      setShowBulkConfirm(false);
      load();
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.state) params.set('state', filters.state);
      if (filters.city) params.set('city', filters.city);
      const url = `/api/companies/export?${params.toString()}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : 'companies.xlsx';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importCompanies(file);
      setImportResult(result);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportResult({ message: msg, inserted: 0, skipped: 0, errors: [msg] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCompany(id);
    setDeleteId(null);
    load();
  };

  const handleToggleActive = async (id: string) => {
    const { isActive } = await toggleCompanyActive(id);
    setCompanies((prev) => prev.map((c) => c._id === id ? { ...c, isActive } : c));
  };

  const th = (label: string, field?: SortKey) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${field ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
      onClick={() => field && handleSort(field)}
    >
      {label}{field && <SortIcon field={field} />}
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total companies</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            title={filters.state || filters.city ? `Export filtered by ${[filters.state, filters.city].filter(Boolean).join(' / ')}` : 'Export all companies'}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Excel
              </>
            )}
          </button>
          <a
            href="/api/companies/sample"
            download="company-import-sample.xlsx"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Sample File
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-2"
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importing…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Excel
              </>
            )}
          </button>
          <Link
            to="/companies/create"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Company
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search companies…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={filters.state}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value, city: '', page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[150px]"
          >
            <option value="">All States</option>
            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value, page: 1 }))}
            disabled={!filters.state}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[150px] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <option value="">{filters.state ? 'All Cities' : 'Select a state first'}</option>
            {cityOptions.map((c) => <option key={`${c.stateName}-${c.name}`} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value as CompanyFilters['isActive'], page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[130px]"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {(filters.city || filters.state || filters.search || filters.isActive) && (
            <button
              onClick={() => { setSearchInput(''); setFilters((prev) => ({ ...prev, search: '', city: '', state: '', isActive: '', page: 1 })); }}
              className="text-sm text-gray-500 hover:text-red-500 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-indigo-800">
              {selected.size} compan{selected.size === 1 ? 'y' : 'ies'} selected
            </span>
          </div>
          <div className="h-4 w-px bg-indigo-200" />
          <button
            onClick={() => setShowBulkConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-indigo-500 hover:text-indigo-700 font-medium"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Select-all checkbox */}
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    disabled={companies.length === 0}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </th>
                {th('Company Name', 'companyName')}
                {th('City', 'city')}
                {th('State', 'state')}
                {th('HR Email', 'hrEmail')}
                {th('Email / Domain')}
                {th('Contact')}
                {th('Contact 2')}
                {th('Website')}
                {th('Created', 'createdAt')}
                {th('Active')}
                {th('Status')}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-400 text-sm">Loading…</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-400 text-sm">No companies found</td>
                </tr>
              ) : (
                companies.map((c) => {
                  const isSelected = selected.has(c._id);
                  return (
                    <tr
                      key={c._id}
                      className={`transition ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      {/* Row checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c._id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800 text-sm">{c.companyName}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.city || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.state || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.hrEmail ? <a href={`mailto:${c.hrEmail}`} className="text-indigo-600 hover:underline">{c.hrEmail}</a> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.email ? <a href={`mailto:${c.email}`} className="text-indigo-600 hover:underline">{c.email}</a> : <span className="text-gray-300">—</span>}
                        {c.coreServicesDomain && <span className="ml-2 text-gray-400 text-xs">{c.coreServicesDomain}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.contactNumber || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.contactNumber2 || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.website ? (
                          <a href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate max-w-[140px] block">
                            {c.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(c._id)}
                          title={c.isActive ? 'Click to deactivate' : 'Click to activate'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${c.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${c.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/companies/${c._id}`)}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/companies/${c._id}/edit`)}
                            className="text-xs px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(c._id)}
                            className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${importResult.inserted > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {importResult.inserted > 0
                  ? <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Import Results</h3>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                <p className="text-xs text-green-700 mt-0.5">Inserted</p>
              </div>
              <div className="flex-1 bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                <p className="text-xs text-yellow-700 mt-0.5">Skipped</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Warnings / Errors</p>
                <ul className="space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setImportResult(null)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Company</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this company? This action cannot be undone.</p>
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

      {/* Bulk Delete Confirm Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete {selected.size} Compan{selected.size === 1 ? 'y' : 'ies'}</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              You are about to permanently delete <span className="font-semibold text-red-600">{selected.size}</span> selected compan{selected.size === 1 ? 'y' : 'ies'}. All associated data will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
              >
                {bulkDeleting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Deleting…
                  </>
                ) : (
                  `Delete ${selected.size} Compan${selected.size === 1 ? 'y' : 'ies'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
