export type PlanType = 'professional';

export interface EmailSettings {
  _id?: string;
  planType: PlanType;
  fromName: string;
  gmailUser: string;
  gmailAppPassword?: string;
  replyTo?: string;
  signature?: string;
  isActive: boolean;
}
