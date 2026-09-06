export interface City {
  _id: string;
  name: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CityFormData {
  name: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  country: string;
  isActive: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CityListResponse {
  data: City[];
  pagination: PaginationMeta;
}

export interface CityFilters {
  search: string;
  stateId: string;
  isActive: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
