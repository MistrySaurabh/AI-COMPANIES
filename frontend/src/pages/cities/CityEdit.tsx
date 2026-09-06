import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { City, CityFormData } from '../../types/city';
import { fetchCity, updateCity } from '../../services/cityService';
import CityForm from '../../components/CityForm';

export default function CityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchCity(id)
      .then(setCity)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: CityFormData) => {
    if (!id) return;
    await updateCity(id, data);
    navigate(`/cities/${id}`);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!city) return <div className="text-center py-20 text-gray-400">City not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(`/cities/${id}`)} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to City
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Edit City</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CityForm
          initialData={{
            name: city.name,
            stateId: city.stateId,
            stateName: city.stateName,
            stateCode: city.stateCode,
            country: city.country,
            isActive: city.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/cities/${id}`)}
          submitLabel="Update City"
        />
      </div>
    </div>
  );
}
