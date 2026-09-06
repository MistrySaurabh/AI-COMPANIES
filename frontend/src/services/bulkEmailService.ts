import axios from 'axios';

const BASE = '/api/bulk-email';

export interface PendingCompany {
  _id: string;
  companyName: string;
  email: string;
  city: string | null;
  state: string | null;
}

export interface BulkStats {
  sentToday: number;
  remainingToday: number;
  dailyLimit: number;
  totalSentEver: number;
  totalPending: number;
}

export interface SendRecipient {
  companyId: string;
  companyName: string;
  email: string;
}

export interface JobStatus {
  id: string;
  total: number;
  current: number;
  sent: number;
  failed: number;
  errors: string[];
  status: 'running' | 'completed';
  startedAt: string;
}

export const fetchPendingCompanies = (params: { search?: string; city?: string; state?: string; isActive?: string }) =>
  axios.get<PendingCompany[]>(`${BASE}/pending-companies`, { params }).then((r) => r.data);

export const fetchFilterOptions = () =>
  axios.get<{ cities: string[]; states: string[] }>(`${BASE}/filter-options`).then((r) => r.data);

export const fetchStats = () =>
  axios.get<BulkStats>(`${BASE}/stats`).then((r) => r.data);

export const startBulkSend = (data: {
  recipients: SendRecipient[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}) =>
  axios.post<{ jobId: string; total: number; skipped: number }>(`${BASE}/send`, data).then((r) => r.data);

export const pollJob = (jobId: string) =>
  axios.get<JobStatus>(`${BASE}/job/${jobId}`).then((r) => r.data);
