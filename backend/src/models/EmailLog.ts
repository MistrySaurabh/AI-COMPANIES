import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailLog extends Document {
  companyId: mongoose.Types.ObjectId;
  companyName: string;
  recipientEmail: string;
  subject: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

const EmailLogSchema = new Schema<IEmailLog>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  companyName: { type: String, required: true },
  recipientEmail: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  errorMessage: { type: String },
});

EmailLogSchema.index({ recipientEmail: 1 });
EmailLogSchema.index({ companyId: 1 });
EmailLogSchema.index({ sentAt: 1 });

export default mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
