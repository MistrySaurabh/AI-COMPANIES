import { useNavigate } from 'react-router-dom';
import { createCompany } from '../../services/companyService';
import { CompanyFormData } from '../../types/company';
import CompanyForm from '../../components/CompanyForm';

export default function CompanyCreate() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CompanyFormData) => {
    await createCompany(data);
    navigate('/companies');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/companies')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to Companies
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add Company</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <CompanyForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/companies')}
          submitLabel="Create Company"
        />
      </div>
    </div>
  );
}
