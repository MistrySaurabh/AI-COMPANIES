import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScrapedCompany extends Document {
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
  rawData: Record<string, unknown>;
  scrapedAt: Date;
  isActive: boolean;
  syncedToCompany: boolean;
  linkedCompanyId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapedCompanySchema = new Schema<IScrapedCompany>(
  {
    companyName: { type: String, required: true, trim: true },
    sourceWebsite: { type: String, required: true, trim: true },
    companyProfileUrl: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    companySize: { type: String, trim: true, default: '' },
    headquarters: { type: String, trim: true, default: '' },
    foundedYear: { type: String, trim: true, default: '' },
    companyType: { type: String, trim: true, default: '' },
    logo: { type: String, trim: true, default: '' },
    socialLinks: { type: Schema.Types.Mixed, default: {} },
    emails: { type: [String], default: [] },
    contactNumbers: { type: [String], default: [] },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    isRemote: { type: Boolean, default: false },
    jobTitle: { type: String, trim: true, default: '' },
    rating: { type: Number, default: null },
    totalReviews: { type: Number, default: null },
    activeJobs: { type: Number, default: null },
    rawData: { type: Schema.Types.Mixed, default: {} },
    scrapedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    syncedToCompany: { type: Boolean, default: false },
    linkedCompanyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  { timestamps: true }
);

// Unique per company+source to prevent duplicates
ScrapedCompanySchema.index({ companyName: 1, sourceWebsite: 1 }, { unique: true });
ScrapedCompanySchema.index({ companyName: 'text' });
ScrapedCompanySchema.index({ scrapedAt: -1 });

export default mongoose.model<IScrapedCompany>('ScrapedCompany', ScrapedCompanySchema);
