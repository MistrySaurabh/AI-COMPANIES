import axios from 'axios';
import { EmailTemplate, EmailTemplateFormData } from '../types/emailTemplate';

const BASE = 'http://localhost:5000/api/email-templates';

export const fetchEmailTemplates = (): Promise<EmailTemplate[]> =>
  axios.get(BASE).then((r) => r.data);

export const fetchEmailTemplate = (id: string): Promise<EmailTemplate> =>
  axios.get(`${BASE}/${id}`).then((r) => r.data);

export const createEmailTemplate = (data: EmailTemplateFormData): Promise<EmailTemplate> =>
  axios.post(BASE, data).then((r) => r.data);

export const updateEmailTemplate = (id: string, data: EmailTemplateFormData): Promise<EmailTemplate> =>
  axios.put(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteEmailTemplate = (id: string): Promise<void> =>
  axios.delete(`${BASE}/${id}`).then((r) => r.data);
