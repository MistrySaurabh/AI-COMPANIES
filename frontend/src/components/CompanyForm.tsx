import { useState, useEffect } from 'react';
import { CompanyFormData } from '../types/company';

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const empty: CompanyFormData = {
  companyName: '',
  address: '',
  website: '',
  hrEmail: '',
  email: '',
  coreServicesDomain: '',
  contactNumber: '',
  contactNumber2: '',
  city: '',
  state: '',
};

export default function CompanyForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: CompanyFormProps) {
  const [form, setForm] = useState<CompanyFormData>({ ...empty, ...initialData });
  const [errors, setErrors] = useState<Partial<CompanyFormData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ ...empty, ...initialData });
  }, [initialData]);

  const validate = (): boolean => {
    const e: Partial<CompanyFormData> = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (form.hrEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.hrEmail)) e.hrEmail = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CompanyFormData]) {
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

  const field = (
    label: string,
    name: keyof CompanyFormData,
    type = 'text',
    placeholder = ''
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {['companyName', 'address'].includes(name) && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          errors[name] ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('Company Name', 'companyName', 'text', 'Acme Corp')}
        {field('Website', 'website', 'url', 'https://example.com')}
        {field('HR Email', 'hrEmail', 'email', 'hr@company.com')}
        {field('Email', 'email', 'email', 'info@company.com')}
        {field('Core Services & Domain', 'coreServicesDomain', 'text', 'e.g. IT Services, Healthcare')}
        {field('Contact Number', 'contactNumber', 'tel', '+1 234 567 8900')}
        {field('Contact Number 2', 'contactNumber2', 'tel', '+1 234 567 8901')}
        {field('City', 'city', 'text', 'New York')}
        {field('State', 'state', 'text', 'NY')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          rows={3}
          placeholder="123 Main St, Suite 100"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            errors.address ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
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
