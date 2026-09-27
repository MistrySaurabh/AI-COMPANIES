import axios from 'axios';
import { ScrapedCompanyListResponse } from '../types/scraper';

const BASE = '/api/scraper';

export const startScrape = (url: string) =>
  axios.post<{ sessionId: string }>(`${BASE}/start`, { url }).then((r) => r.data);

export const stopScrape = (sessionId: string) =>
  axios.post(`${BASE}/stop/${sessionId}`).then((r) => r.data);

export const startRescrapeDetails = (mode: 'missing' | 'all') =>
  axios.post<{ sessionId: string }>(`${BASE}/rescrape-details`, { mode }).then((r) => r.data);

export const startFillCityState = () =>
  axios.post<{ sessionId: string }>(`${BASE}/fill-city-state`).then((r) => r.data);

export const startPlacesEnrich = (mode: 'missing' | 'all') =>
  axios.post<{ sessionId: string }>(`${BASE}/places-enrich`, { mode }).then((r) => r.data);

export const startWebsiteEmailScrape = (mode: 'missing' | 'all') =>
  axios.post<{ sessionId: string }>(`${BASE}/website-emails`, { mode }).then((r) => r.data);

export const cleanBadWebsiteUrls = () =>
  axios.post<{ updated: number }>(`${BASE}/clean-bad-websites`).then((r) => r.data);

export const fetchScrapedCompanyFilterOptions = () =>
  axios.get<{ cities: string[]; states: string[] }>(`${BASE}/companies/filter-options`).then((r) => r.data);

export const fetchScrapedCompanies = (params: {
  page?: number;
  limit?: number;
  search?: string;
  sourceWebsite?: string;
  city?: string;
  state?: string;
  isRemote?: string;
}) =>
  axios.get<ScrapedCompanyListResponse>(`${BASE}/companies`, { params }).then((r) => r.data);

export const deleteScrapedCompany = (id: string) =>
  axios.delete(`${BASE}/companies/${id}`).then((r) => r.data);

export const bulkDeleteScrapedCompanies = (ids: string[]) =>
  axios.post<{ deletedCount: number }>(`${BASE}/companies/bulk-delete`, { ids }).then((r) => r.data);

export const bulkSyncScrapedCompanies = (ids: string[]) =>
  axios.post<{ synced: number; skipped: number; errors: string[] }>(`${BASE}/companies/bulk-sync`, { ids }).then((r) => r.data);

export const syncScrapedCompanyToCompany = (id: string) =>
  axios.post(`${BASE}/companies/${id}/sync`).then((r) => r.data);
