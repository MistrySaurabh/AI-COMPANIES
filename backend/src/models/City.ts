import mongoose, { Document, Schema } from 'mongoose';

export interface ICity extends Document {
  name: string;
  stateId: mongoose.Types.ObjectId;
  stateName: string;
  stateCode: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema = new Schema<ICity>(
  {
    name: { type: String, required: true, trim: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true },
    stateName: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, trim: true, uppercase: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CitySchema.index({ name: 1, stateId: 1 }, { unique: true });
CitySchema.index({ stateId: 1 });
CitySchema.index({ name: 'text' });

export default mongoose.model<ICity>('City', CitySchema);
