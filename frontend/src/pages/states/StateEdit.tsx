import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { State, StateFormData } from '../../types/state';
import { fetchState, updateState } from '../../services/stateService';
import StateForm from '../../components/StateForm';

export default function StateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchState(id)
      .then(setState)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: StateFormData) => {
    if (!id) return;
    await updateState(id, data);
    navigate(`/states/${id}`);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!state) return <div className="text-center py-20 text-gray-400">State not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(`/states/${id}`)} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to State
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Edit State</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <StateForm
          initialData={{
            name: state.name,
            code: state.code,
            country: state.country,
            isActive: state.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/states/${id}`)}
          submitLabel="Update State"
        />
      </div>
    </div>
  );
}
