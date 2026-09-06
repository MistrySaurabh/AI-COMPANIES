import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  address: string;
  website: string;
  hrEmail: string | null;
  email: string | null;
  coreServicesDomain: string | null;
  contactNumber: string | null;
  contactNumber2: string | null;
  city: string | null;
  cityId: mongoose.Types.ObjectId | null;
  state: string | null;
  stateId: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    companyName: { type: String, required: true, trim: true },
    address: { type: String, required: false, default: '', trim: true },
    website: { type: String, trim: true, default: '' },
    hrEmail: { type: String, trim: true, lowercase: true, default: null },
    email: { type: String, default: null, lowercase: true },
    coreServicesDomain: { type: String, trim: true, default: null },
    contactNumber: { type: String, trim: true, default: null },
    contactNumber2: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', default: null },
    state: { type: String, trim: true, default: null },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompanySchema.index({ companyName: 'text', city: 1, state: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
