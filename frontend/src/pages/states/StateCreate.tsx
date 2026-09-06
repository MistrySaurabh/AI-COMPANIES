import { useNavigate } from 'react-router-dom';
import { createState } from '../../services/stateService';
import { StateFormData } from '../../types/state';
import StateForm from '../../components/StateForm';

export default function StateCreate() {
  const navigate = useNavigate();

  const handleSubmit = async (data: StateFormData) => {
    await createState(data);
    navigate('/states');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/states')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to States
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add State</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <StateForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/states')}
          submitLabel="Create State"
        />
      </div>
    </div>
  );
}
