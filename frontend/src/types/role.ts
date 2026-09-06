export interface Role {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  isActive: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleListResponse {
  data: Role[];
  pagination: PaginationMeta;
}

export interface RoleFilters {
  search: string;
  isActive: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
