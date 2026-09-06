import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Company } from '../../types/company';
import { fetchCompany, updateCompany, toggleCompanyActive } from '../../services/companyService';
import { CompanyFormData } from '../../types/company';
import CompanyForm from '../../components/CompanyForm';

export default function CompanyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCompany(id)
      .then(setCompany)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: CompanyFormData) => {
    if (!id) return;
    await updateCompany(id, data);
    navigate(`/companies/${id}`);
  };

  const handleToggleActive = async () => {
    if (!id || !company) return;
    setToggling(true);
    try {
      const { isActive } = await toggleCompanyActive(id);
      setCompany((prev) => prev ? { ...prev, isActive } : prev);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!company) return <div className="text-center py-20 text-gray-400">Company not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(`/companies/${id}`)} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to Company
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Edit {company.companyName}</h1>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${company.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {company.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              title={company.isActive ? 'Click to deactivate' : 'Click to activate'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${company.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${company.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CompanyForm
          initialData={company}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/companies/${id}`)}
          submitLabel="Update Company"
        />
      </div>
    </div>
  );
}
