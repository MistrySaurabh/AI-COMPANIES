import { useState, useEffect } from 'react';
import { RoleFormData } from '../types/role';

interface RoleFormProps {
  initialData?: Partial<RoleFormData>;
  onSubmit: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const empty: RoleFormData = {
  name: '',
  description: '',
  isActive: true,
};

export default function RoleForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: RoleFormProps) {
  const [form, setForm] = useState<RoleFormData>({ ...empty, ...initialData });
  const [errors, setErrors] = useState<Partial<Record<keyof RoleFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ ...empty, ...initialData });
  }, [initialData]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof RoleFormData, string>> = {};
    if (!form.name.trim()) e.name = 'Role name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name as keyof RoleFormData]) {
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Software Engineer"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Brief description of this role…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="flex items-center gap-3">
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
