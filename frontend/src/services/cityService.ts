import axios from 'axios';
import { City, CityFormData, CityListResponse, CityFilters } from '../types/city';

const BASE = '/api/cities';

export const fetchCities = (filters: Partial<CityFilters>) =>
  axios.get<CityListResponse>(BASE, { params: filters }).then((r) => r.data);

export const fetchCity = (id: string) =>
  axios.get<City>(`${BASE}/${id}`).then((r) => r.data);

export const createCity = (data: CityFormData) =>
  axios.post<City>(BASE, data).then((r) => r.data);

export const updateCity = (id: string, data: CityFormData) =>
  axios.put<City>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteCity = (id: string) =>
  axios.delete(`${BASE}/${id}`).then((r) => r.data);

export const toggleCityStatus = (id: string) =>
  axios.patch<City>(`${BASE}/${id}/toggle`).then((r) => r.data);
