export type BlockType =
  | 'header'
  | 'subject-banner'
  | 'social-links'
  | 'heading'
  | 'text'
  | 'button'
  | 'table'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'info-box'
  | 'two-column';

export interface EmailBlock {
  id: string;
  type: BlockType;
  data: Record<string, any>;
}

export interface FooterLink {
  label: string;
  url: string;
  bgColor: string;
  textColor: string;
}

export interface TemplateSettings {
  outerBgColor: string;
  containerBgColor: string;
  containerBorderRadius: string;
  footerEnabled: boolean;
  footerBgColor: string;
  footerBorderTopColor: string;
  footerText: string;
  footerName: string;
  footerTextColor: string;
  footerNameColor: string;
  footerLinks: FooterLink[];
}

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  outerBgColor: '#f4f4f5',
  containerBgColor: '#ffffff',
  containerBorderRadius: '8',
  footerEnabled: true,
  footerBgColor: '#f8fafc',
  footerBorderTopColor: '#e5e7eb',
  footerText: 'Thanks & Regards,',
  footerName: 'Your Name',
  footerTextColor: '#6b7280',
  footerNameColor: '#4f46e5',
  footerLinks: [],
};

export interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  blocks: EmailBlock[];
  settings: TemplateSettings;
  html: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateFormData {
  name: string;
  subject: string;
  blocks: EmailBlock[];
  settings: TemplateSettings;
  html: string;
}
