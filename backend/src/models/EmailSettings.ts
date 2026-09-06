import mongoose, { Document, Schema } from 'mongoose';

export type PlanType = 'professional';

export interface IEmailSettings extends Document {
  planType: PlanType;
  fromName: string;
  gmailUser: string;
  gmailAppPassword: string;
  replyTo?: string;
  signature?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSettingsSchema = new Schema<IEmailSettings>(
  {
    planType: {
      type: String,
      enum: ['professional'],
      required: true,
      unique: true,
    },
    fromName: { type: String, required: true, trim: true },
    gmailUser: { type: String, required: true, trim: true },
    gmailAppPassword: { type: String, required: true },
    replyTo: { type: String, trim: true },
    signature: { type: String },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IEmailSettings>('EmailSettings', EmailSettingsSchema);
