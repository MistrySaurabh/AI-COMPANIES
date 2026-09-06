import axios from 'axios';

const BASE = '/api/email-logs';

export interface EmailLog {
  _id: string;
  companyId: string;
  companyName: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  sentAt: string;
  errorMessage?: string;
}

export interface EmailLogFilters {
  status: '' | 'sent' | 'failed';
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

export const fetchEmailLogs = (filters: EmailLogFilters) => {
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
  };
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  return axios
    .get<{ data: EmailLog[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(BASE, { params })
    .then((r) => r.data);
};

export const deleteEmailLog = (id: string) => axios.delete(`${BASE}/${id}`);

export const clearEmailLogs = (status?: 'sent' | 'failed') =>
  axios.delete(`${BASE}/clear`, { params: status ? { status } : {} }).then((r) => r.data as { deleted: number });
