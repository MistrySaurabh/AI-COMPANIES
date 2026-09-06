import { useNavigate } from 'react-router-dom';
import { createRole } from '../../services/roleService';
import { RoleFormData } from '../../types/role';
import RoleForm from '../../components/RoleForm';

export default function RoleCreate() {
  const navigate = useNavigate();

  const handleSubmit = async (data: RoleFormData) => {
    await createRole(data);
    navigate('/roles');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/roles')} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to Roles
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add Role</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <RoleForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/roles')}
          submitLabel="Create Role"
        />
      </div>
    </div>
  );
}
