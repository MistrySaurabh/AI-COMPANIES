export interface Skill {
  name: string;
  experience: string;
}

export interface PersonalInfo {
  _id?: string;
  name: string;
  emailSubject: string;
  role: string;
  workExperience: string;
  skills: Skill[];
  noticePeriod: string;
  currentCTC: string;
  expectedCTC: string;
  portfolioLink: string;
  linkedinLink: string;
  githubLink: string;
  phone: string;
  email: string;
  customMessage: string;
}

export type TemplateType = 'professional' | 'extrovert';
