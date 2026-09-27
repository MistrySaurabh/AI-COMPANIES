import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailBlock {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface IEmailTemplate extends Document {
  name: string;
  subject: string;
  blocks: IEmailBlock[];
  settings: Record<string, any>;
  html: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailBlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    blocks: { type: [EmailBlockSchema], default: [] },
    settings: { type: Schema.Types.Mixed, default: {} },
    html: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
