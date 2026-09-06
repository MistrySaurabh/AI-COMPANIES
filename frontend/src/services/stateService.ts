import axios from 'axios';
import { State, StateFormData, StateListResponse, StateFilters } from '../types/state';

const BASE = '/api/states';

export const fetchStates = (filters: Partial<StateFilters>) =>
  axios.get<StateListResponse>(BASE, { params: filters }).then((r) => r.data);

export const fetchState = (id: string) =>
  axios.get<State>(`${BASE}/${id}`).then((r) => r.data);

export const createState = (data: StateFormData) =>
  axios.post<State>(BASE, data).then((r) => r.data);

export const updateState = (id: string, data: StateFormData) =>
  axios.put<State>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteState = (id: string) =>
  axios.delete(`${BASE}/${id}`).then((r) => r.data);

export const toggleStateStatus = (id: string) =>
  axios.patch<State>(`${BASE}/${id}/toggle`).then((r) => r.data);

export const fetchAllActiveStates = () =>
  axios.get<{ _id: string; name: string; code: string }[]>(`${BASE}/all-active`).then((r) => r.data);
