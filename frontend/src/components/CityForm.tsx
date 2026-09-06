import { useState, useEffect } from 'react';
import { CityFormData } from '../types/city';
import { fetchAllActiveStates } from '../services/stateService';

interface CityFormProps {
  initialData?: Partial<CityFormData>;
  onSubmit: (data: CityFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const empty: CityFormData = {
  name: '',
  stateId: '',
  stateName: '',
  stateCode: '',
  country: 'India',
  isActive: true,
};

export default function CityForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: CityFormProps) {
  const [form, setForm] = useState<CityFormData>({ ...empty, ...initialData });
  const [errors, setErrors] = useState<Partial<Record<keyof CityFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<{ _id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    fetchAllActiveStates().then(setStates);
  }, []);

  useEffect(() => {
    setForm({ ...empty, ...initialData });
  }, [initialData]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof CityFormData, string>> = {};
    if (!form.name.trim()) e.name = 'City name is required';
    if (!form.stateId) e.stateId = 'State is required';
    if (!form.country.trim()) e.country = 'Country is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedState = states.find((s) => s._id === selectedId);
    setForm((prev) => ({
      ...prev,
      stateId: selectedId,
      stateName: selectedState?.name || '',
      stateCode: selectedState?.code || '',
    }));
    if (errors.stateId) setErrors((prev) => ({ ...prev, stateId: undefined }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name as keyof CityFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Mumbai"
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            name="stateId"
            value={form.stateId}
            onChange={handleStateChange}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.stateId ? 'border-red-400' : 'border-gray-300'}`}
          >
            <option value="">Select a state…</option>
            {states.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          {errors.stateId && <p className="text-red-500 text-xs mt-1">{errors.stateId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            placeholder="India"
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.country ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
        </div>

        <div className="flex items-center gap-3 pt-6">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {form.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
