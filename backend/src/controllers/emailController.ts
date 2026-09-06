import { Request, Response } from 'express';
import { sendEmail, verifyEmailConnection } from '../services/emailService';

export const sendMail = async (req: Request, res: Response): Promise<void> => {
  const { to, subject, text, html, attachments } = req.body;

  if (!to || !subject) {
    res.status(400).json({ message: 'to and subject are required' });
    return;
  }
  if (!text?.trim() && !html?.trim()) {
    res.status(400).json({ message: 'Email body (text or html) is required' });
    return;
  }

  try {
    await sendEmail({ to, subject, text, html, attachments });
    res.json({ message: 'Email sent successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

export const checkEmailConnection = async (_req: Request, res: Response): Promise<void> => {
  const isConnected = await verifyEmailConnection();
  if (isConnected) {
    res.json({ status: 'ok', message: 'Gmail SMTP connection verified' });
  } else {
    res.status(500).json({ status: 'error', message: 'Gmail SMTP connection failed' });
  }
};
