import { useNavigate } from 'react-router-dom';
import { createCity } from '../../services/cityService';
import { CityFormData } from '../../types/city';
import CityForm from '../../components/CityForm';

export default function CityCreate() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CityFormData) => {
    await createCity(data);
    navigate('/cities');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/cities')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to Cities
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add City</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CityForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/cities')}
          submitLabel="Create City"
        />
      </div>
    </div>
  );
}
