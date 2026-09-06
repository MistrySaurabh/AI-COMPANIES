import nodemailer from 'nodemailer';
import EmailSettings from '../models/EmailSettings';

export interface AttachmentOption {
  filename: string;
  content: string;   // base64-encoded
  contentType: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentOption[];
}

const createTransporter = async () => {
  const settings = await EmailSettings.findOne({ planType: 'professional' });

  if (settings?.gmailUser && settings?.gmailAppPassword) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: settings.gmailUser, pass: settings.gmailAppPassword },
      }),
      from: `"${settings.fromName || 'AI Companies'}" <${settings.gmailUser}>`,
    };
  }

  // Fallback to .env
  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    }),
    from: `"${process.env.GMAIL_FROM_NAME || 'AI Companies'}" <${process.env.GMAIL_USER}>`,
  };
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const { transporter, from } = await createTransporter();
  await transporter.sendMail({
    from,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
      contentType: a.contentType,
    })),
  });
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const { transporter } = await createTransporter();
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
};
