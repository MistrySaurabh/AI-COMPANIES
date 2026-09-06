import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { State } from '../../types/state';
import { fetchState, toggleStateStatus } from '../../services/stateService';

export default function StateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchState(id)
      .then(setState)
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggle = async () => {
    if (!state) return;
    setToggling(true);
    try {
      const updated = await toggleStateStatus(state._id);
      setState(updated);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!state) return <div className="text-center py-20 text-gray-400">State not found</div>;

  const row = (label: string, value: React.ReactNode) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 sm:mt-0 sm:col-span-2 text-sm text-gray-800">{value}</dd>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/states')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
            ← Back to States
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{state.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-60 ${
              state.isActive
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {toggling ? '…' : state.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <Link
            to={`/states/${state._id}/edit`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <dl>
          {row('State Name', state.name)}
          {row('State Code', <span className="font-mono font-semibold">{state.code}</span>)}
          {row('Country', state.country)}
          {row('Status', (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              state.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {state.isActive ? 'Active' : 'Inactive'}
            </span>
          ))}
          {row('Created', new Date(state.createdAt).toLocaleString())}
          {row('Updated', new Date(state.updatedAt).toLocaleString())}
        </dl>
      </div>
    </div>
  );
}
