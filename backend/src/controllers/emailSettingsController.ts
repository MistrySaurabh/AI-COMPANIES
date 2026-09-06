import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import EmailSettings, { PlanType } from '../models/EmailSettings';

const PLAN_TYPES: PlanType[] = ['professional'];

export const getAllSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await EmailSettings.find().lean();

    // Return all three plans (fill missing ones with defaults)
    const result = PLAN_TYPES.map((planType) => {
      const found = settings.find((s) => s.planType === planType);
      return found ?? { planType, fromName: '', gmailUser: '', replyTo: '', signature: '', isActive: false };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch email settings', error: error.message });
  }
};

export const upsertSettings = async (req: Request, res: Response): Promise<void> => {
  const { planType } = req.params;

  if (!PLAN_TYPES.includes(planType as PlanType)) {
    res.status(400).json({ message: 'Invalid plan type. Must be professional, premium, or extrovert.' });
    return;
  }

  const { fromName, gmailUser, gmailAppPassword, replyTo, signature, isActive } = req.body;

  if (!fromName || !gmailUser) {
    res.status(400).json({ message: 'fromName and gmailUser are required' });
    return;
  }

  try {
    const updateData: any = { fromName, gmailUser, replyTo, signature, isActive };

    if (gmailAppPassword) {
      updateData.gmailAppPassword = gmailAppPassword;
    }

    // If setting this plan as active, deactivate others
    if (isActive) {
      await EmailSettings.updateMany({ planType: { $ne: planType } }, { isActive: false });
    }

    const settings = await EmailSettings.findOneAndUpdate(
      { planType },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save email settings', error: error.message });
  }
};

export const testConnection = async (req: Request, res: Response): Promise<void> => {
  const { planType } = req.params;

  try {
    const settings = await EmailSettings.findOne({ planType });

    if (!settings) {
      res.status(404).json({ message: 'Settings not configured for this plan' });
      return;
    }

    if (!settings.gmailUser || !settings.gmailAppPassword) {
      res.status(400).json({ message: 'Gmail credentials are not configured' });
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: settings.gmailUser, pass: settings.gmailAppPassword },
    });

    await transporter.verify();
    res.json({ status: 'ok', message: `Gmail SMTP verified for ${planType} plan` });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Connection failed', error: error.message });
  }
};

export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  const { to } = req.body;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    res.status(400).json({ message: 'to is required' });
    return;
  }

  const settings = await EmailSettings.findOne({ planType: 'professional' });
  if (!settings?.gmailUser || !settings?.gmailAppPassword) {
    res.status(400).json({ message: 'Professional email settings are not configured. Please save your Gmail credentials first.' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: settings.gmailUser, pass: settings.gmailAppPassword },
    });

    const recipients = Array.isArray(to) ? to : [to];

    await transporter.sendMail({
      from: `"${settings.fromName || 'AI Companies'}" <${settings.gmailUser}>`,
      to: recipients.join(', '),
      subject: 'Test Email — AI Companies Mail Studio',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">Mail Studio — Test Email</h2>
          <p style="color:#374151;">This is a test email sent from <strong>AI Companies Mail Studio</strong>.</p>
          <p style="color:#374151;">Your Gmail SMTP connection is working correctly.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Sent from: ${settings.gmailUser}</p>
        </div>
      `,
    });

    res.json({ message: `Test email sent to ${recipients.join(', ')}` });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
};

export const getActiveSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await EmailSettings.findOne({ isActive: true });
    if (!settings) {
      res.status(404).json({ message: 'No active email settings found' });
      return;
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch active settings', error: error.message });
  }
};
