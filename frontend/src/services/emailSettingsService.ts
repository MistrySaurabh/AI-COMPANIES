import axios from 'axios';
import { EmailSettings, PlanType } from '../types/emailSettings';

const BASE = '/api/email-settings';

export const fetchAllSettings = () =>
  axios.get<EmailSettings[]>(BASE).then((r) => r.data);

export const saveSettings = (planType: PlanType, data: Partial<EmailSettings>) =>
  axios.put<EmailSettings>(`${BASE}/${planType}`, data).then((r) => r.data);

export const testConnection = (planType: PlanType) =>
  axios.post<{ status: string; message: string }>(`${BASE}/${planType}/test`).then((r) => r.data);

export const sendTestEmail = (to: string[]) =>
  axios.post<{ message: string }>(`${BASE}/send-test`, { to }).then((r) => r.data);
