import mongoose, { Document, Schema } from 'mongoose';

export interface ISkill {
  name: string;
  experience: string;
}

export interface IPersonalInfo extends Document {
  name: string;
  emailSubject: string;
  role: string;
  workExperience: string;
  skills: ISkill[];
  noticePeriod: string;
  currentCTC: string;
  expectedCTC: string;
  portfolioLink: string;
  linkedinLink: string;
  githubLink: string;
  phone: string;
  email: string;
  customMessage: string;
  updatedAt: Date;
}

const SkillSchema = new Schema<ISkill>({ name: String, experience: String }, { _id: false });

const PersonalInfoSchema = new Schema<IPersonalInfo>(
  {
    name: { type: String, default: '' },
    emailSubject: { type: String, default: '' },
    role: { type: String, default: '' },
    workExperience: { type: String, default: '' },
    skills: { type: [SkillSchema], default: [] },
    noticePeriod: { type: String, default: '' },
    currentCTC: { type: String, default: '' },
    expectedCTC: { type: String, default: '' },
    portfolioLink: { type: String, default: '' },
    linkedinLink: { type: String, default: '' },
    githubLink: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    customMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IPersonalInfo>('PersonalInfo', PersonalInfoSchema);
