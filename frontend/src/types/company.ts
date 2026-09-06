export interface Company {
  _id: string;
  companyName: string;
  address: string;
  website: string;
  hrEmail: string | null;
  email: string | null;
  coreServicesDomain: string | null;
  contactNumber: string | null;
  contactNumber2: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFormData {
  companyName: string;
  address: string;
  website: string;
  hrEmail: string;
  email: string;
  coreServicesDomain: string;
  contactNumber: string;
  contactNumber2: string;
  city: string;
  state: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompanyListResponse {
  data: Company[];
  pagination: PaginationMeta;
}

export interface CompanyFilters {
  search: string;
  city: string;
  state: string;
  isActive: '' | 'true' | 'false';
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
