import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoleSchema.index({ name: 'text' });

export default mongoose.model<IRole>('Role', RoleSchema);
