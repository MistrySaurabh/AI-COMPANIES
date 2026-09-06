export interface State {
  _id: string;
  name: string;
  code: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StateFormData {
  name: string;
  code: string;
  country: string;
  isActive: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StateListResponse {
  data: State[];
  pagination: PaginationMeta;
}

export interface StateFilters {
  search: string;
  isActive: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
