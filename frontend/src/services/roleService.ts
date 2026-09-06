import axios from 'axios';
import { Role, RoleFormData, RoleListResponse, RoleFilters } from '../types/role';

const BASE = '/api/roles';

export const fetchRoles = (filters: Partial<RoleFilters>) =>
  axios.get<RoleListResponse>(BASE, { params: filters }).then((r) => r.data);

export const fetchRole = (id: string) =>
  axios.get<Role>(`${BASE}/${id}`).then((r) => r.data);

export const createRole = (data: RoleFormData) =>
  axios.post<Role>(BASE, data).then((r) => r.data);

export const updateRole = (id: string, data: RoleFormData) =>
  axios.put<Role>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteRole = (id: string) =>
  axios.delete(`${BASE}/${id}`).then((r) => r.data);

export const toggleRoleStatus = (id: string) =>
  axios.patch<Role>(`${BASE}/${id}/toggle`).then((r) => r.data);
