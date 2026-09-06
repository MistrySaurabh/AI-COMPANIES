import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Company } from '../../types/company';
import { fetchCompany } from '../../services/companyService';

export default function CompanyView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchCompany(id)
      .then(setCompany)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!company) return <div className="text-center py-20 text-gray-400">Company not found</div>;

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
          <button onClick={() => navigate('/companies')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
            ← Back to Companies
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{company.companyName}</h1>
        </div>
        <Link
          to={`/companies/${company._id}/edit`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
        >
          Edit
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <dl>
          {row('Company Name', company.companyName)}
          {row('Address', <span className="whitespace-pre-line">{company.address}</span>)}
          {row('Website', company.website ? (
            <a href={/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              {company.website}
            </a>
          ) : '—')}
          {row('HR Email', company.hrEmail ? <a href={`mailto:${company.hrEmail}`} className="text-indigo-600 hover:underline">{company.hrEmail}</a> : '—')}
          {row('Email', company.email ? <a href={`mailto:${company.email}`} className="text-indigo-600 hover:underline">{company.email}</a> : '—')}
          {row('Core Services & Domain', company.coreServicesDomain || '—')}
          {row('Contact Number', company.contactNumber || '—')}
          {row('Contact Number 2', company.contactNumber2 || '—')}
          {row('City', company.city || '—')}
          {row('State', company.state || '—')}
          {row('Created', new Date(company.createdAt).toLocaleString())}
          {row('Updated', new Date(company.updatedAt).toLocaleString())}
        </dl>
      </div>
    </div>
  );
}
