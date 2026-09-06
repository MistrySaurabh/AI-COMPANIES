import axios from 'axios';
import { Company, CompanyFormData, CompanyListResponse, CompanyFilters } from '../types/company';

const BASE = '/api/companies';

export const fetchCompanies = (filters: Partial<CompanyFilters>) =>
  axios.get<CompanyListResponse>(BASE, { params: filters }).then((r) => r.data);

export const fetchCompany = (id: string) =>
  axios.get<Company>(`${BASE}/${id}`).then((r) => r.data);

export const createCompany = (data: CompanyFormData) =>
  axios.post<Company>(BASE, data).then((r) => r.data);

export const updateCompany = (id: string, data: CompanyFormData) =>
  axios.put<Company>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteCompany = (id: string) =>
  axios.delete(`${BASE}/${id}`).then((r) => r.data);

export const bulkDeleteCompanies = (ids: string[]) =>
  axios.delete(`${BASE}/bulk`, { data: { ids } }).then((r) => r.data as { deletedCount: number });

export interface CityOption {
  name: string;
  stateName: string;
}

export const fetchFilterOptions = () =>
  axios.get<{ cities: CityOption[]; states: string[] }>(`${BASE}/filter-options`).then((r) => r.data);

export interface ImportResult {
  message: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

export const toggleCompanyActive = (id: string) =>
  axios.patch<{ isActive: boolean }>(`${BASE}/${id}/toggle-active`).then((r) => r.data);

export const importCompanies = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return axios.post<ImportResult>(`${BASE}/import`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
