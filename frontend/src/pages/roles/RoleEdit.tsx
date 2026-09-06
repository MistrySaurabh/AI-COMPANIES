import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Role, RoleFormData } from '../../types/role';
import { fetchRole, updateRole } from '../../services/roleService';
import RoleForm from '../../components/RoleForm';

export default function RoleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchRole(id)
      .then(setRole)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: RoleFormData) => {
    if (!id) return;
    await updateRole(id, data);
    navigate(`/roles/${id}`);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!role) return <div className="text-center py-20 text-gray-400">Role not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(`/roles/${id}`)} className="text-sm text-gray-500 hover:text-indigo-600 mb-2">
          ← Back to Role
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Edit Role</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <RoleForm
          initialData={{
            name: role.name,
            description: role.description,
            isActive: role.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/roles/${id}`)}
          submitLabel="Update Role"
        />
      </div>
    </div>
  );
}
