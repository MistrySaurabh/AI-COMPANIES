export interface ScrapedCompany {
  _id: string;
  companyName: string;
  sourceWebsite: string;
  companyProfileUrl: string;
  website: string;
  description: string;
  industry: string;
  companySize: string;
  headquarters: string;
  foundedYear: string;
  companyType: string;
  logo: string;
  socialLinks: Record<string, string>;
  emails: string[];
  contactNumbers: string[];
  address: string;
  city: string;
  state: string;
  isRemote: boolean;
  jobTitle: string;
  rating: number | null;
  totalReviews: number | null;
  activeJobs: number | null;
  scrapedAt: string;
  createdAt: string;
  syncedToCompany: boolean;
  linkedCompanyId: string | null;
}

export interface ScrapedCompanyListResponse {
  companies: ScrapedCompany[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScrapeStats {
  pagesScraped: number;
  companiesFound: number;
  companiesSaved: number;
  companiesSkipped: number;
  errors: number;
  currentPage?: number;
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'skip';
  time: string;
}
