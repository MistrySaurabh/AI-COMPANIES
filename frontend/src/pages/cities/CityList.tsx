import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { City, CityFilters } from '../../types/city';
import { fetchCities, deleteCity, toggleCityStatus } from '../../services/cityService';
import { fetchAllActiveStates } from '../../services/stateService';
import Pagination from '../../components/Pagination';

type SortKey = 'name' | 'stateName' | 'stateCode' | 'country' | 'isActive' | 'createdAt';

export default function CityList() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [stateOptions, setStateOptions] = useState<{ _id: string; name: string; code: string }[]>([]);

  const [filters, setFilters] = useState<CityFilters>({
    search: '',
    stateId: '',
    isActive: '',
    sortField: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });

  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCities(filters);
      setCities(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchAllActiveStates().then(setStateOptions);
  }, []);

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

  const handleDelete = async (id: string) => {
    await deleteCity(id);
    setDeleteId(null);
    load();
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const updated = await toggleCityStatus(id);
      setCities((prev) => prev.map((c) => (c._id === id ? updated : c)));
    } finally {
      setTogglingId(null);
    }
  };

  const hasFilters = filters.search || filters.stateId || filters.isActive;

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
          <h1 className="text-2xl font-bold text-gray-800">Cities</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total cities</p>
        </div>
        <Link
          to="/cities/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Add City
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by city, state…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={filters.stateId}
            onChange={(e) => setFilters((prev) => ({ ...prev, stateId: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[160px]"
          >
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
            ))}
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value, page: 1 }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearchInput(''); setFilters((prev) => ({ ...prev, search: '', stateId: '', isActive: '', page: 1 })); }}
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
                {th('City Name', 'name')}
                {th('State', 'stateName')}
                {th('Code', 'stateCode')}
                {th('Country', 'country')}
                {th('Status', 'isActive')}
                {th('Created', 'createdAt')}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading…</td>
                </tr>
              ) : cities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No cities found</td>
                </tr>
              ) : (
                cities.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.stateName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{c.stateCode}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.country}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(c._id)}
                        disabled={togglingId === c._id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                          c.isActive ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                        title={c.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            c.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`ml-2 text-xs font-medium ${c.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/cities/${c._id}`)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/cities/${c._id}/edit`)}
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

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete City</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this city? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
