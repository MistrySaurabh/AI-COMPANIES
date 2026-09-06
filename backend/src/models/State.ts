import mongoose, { Document, Schema } from 'mongoose';

export interface IState extends Document {
  name: string;
  code: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StateSchema.index({ name: 1, country: 1 }, { unique: true });
StateSchema.index({ code: 1 });

export default mongoose.model<IState>('State', StateSchema);
