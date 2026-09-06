import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import Company from '../models/Company';
import EmailLog from '../models/EmailLog';
import EmailSettings from '../models/EmailSettings';

const DAILY_LIMIT = 500;
const POOL_CONNECTIONS = 10; // parallel SMTP connections

// ─── In-memory job store ───────────────────────────────────────────────────────
interface Job {
  id: string;
  total: number;
  current: number;
  sent: number;
  failed: number;
  errors: string[];
  status: 'running' | 'completed';
  startedAt: Date;
}
const jobs = new Map<string, Job>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};


// ─── GET /pending-companies ───────────────────────────────────────────────────
export const getPendingCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, city, state, isActive } = req.query as Record<string, string>;

    // All emails already sent (ever)
    const sentEmails = await EmailLog.distinct('recipientEmail', { status: 'sent' });
    const sentSet = new Set(sentEmails.map((e: string) => e.toLowerCase()));

    // Build filter: must have hrEmail or email
    const filter: any = {
      $or: [
        { hrEmail: { $nin: [null, ''] } },
        { email: { $nin: [null, ''] } },
      ],
    };
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (search) filter.companyName = { $regex: search, $options: 'i' };
    if (isActive === 'true') filter.isActive = true;
    else if (isActive === 'false') filter.isActive = { $ne: true };

    const companies = await Company.find(filter)
      .select('companyName hrEmail email city state')
      .lean();

    // Resolve primary email per company and exclude already-sent
    const pending = companies
      .map((c) => ({
        _id: c._id,
        companyName: c.companyName,
        email: (c.hrEmail || c.email || '').toLowerCase(),
        city: c.city,
        state: c.state,
      }))
      .filter((c) => c.email && !sentSet.has(c.email));

    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch pending companies', error: error.message });
  }
};

// ─── GET /filter-options ──────────────────────────────────────────────────────
export const getFilterOptions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sentEmails = await EmailLog.distinct('recipientEmail', { status: 'sent' });
    const sentSet = new Set(sentEmails.map((e: string) => e.toLowerCase()));

    const companies = await Company.find({
      $or: [{ hrEmail: { $nin: [null, ''] } }, { email: { $nin: [null, ''] } }],
    }).select('hrEmail email city state').lean();

    const pending = companies.filter((c) => {
      const email = (c.hrEmail || c.email || '').toLowerCase();
      return email && !sentSet.has(email);
    });

    const cities = [...new Set(pending.map((c) => c.city).filter(Boolean))].sort();
    const states = [...new Set(pending.map((c) => c.state).filter(Boolean))].sort();

    res.json({ cities, states });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch filter options', error: error.message });
  }
};

// ─── GET /stats ───────────────────────────────────────────────────────────────
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sentToday = await EmailLog.countDocuments({
      status: 'sent',
      sentAt: { $gte: todayStart() },
    });

    const totalSentEver = await EmailLog.countDocuments({ status: 'sent' });

    const totalWithEmail = await Company.countDocuments({
      $or: [{ hrEmail: { $nin: [null, ''] } }, { email: { $nin: [null, ''] } }],
    });

    const sentEmails = await EmailLog.distinct('recipientEmail', { status: 'sent' });

    res.json({
      sentToday,
      remainingToday: Math.max(0, DAILY_LIMIT - sentToday),
      dailyLimit: DAILY_LIMIT,
      totalSentEver,
      totalPending: totalWithEmail - sentEmails.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

// ─── POST /send ───────────────────────────────────────────────────────────────
export const startBulkSend = async (req: Request, res: Response): Promise<void> => {
  const { recipients, subject, html, attachments } = req.body as {
    recipients: { companyId: string; companyName: string; email: string }[];
    subject: string;
    html: string;
    attachments?: { filename: string; content: string; contentType: string }[];
  };

  if (!recipients?.length || !subject || !html) {
    res.status(400).json({ message: 'recipients, subject, and html are required' });
    return;
  }

  // Check daily limit
  const sentToday = await EmailLog.countDocuments({
    status: 'sent',
    sentAt: { $gte: todayStart() },
  });
  const remaining = DAILY_LIMIT - sentToday;

  if (remaining <= 0) {
    res.status(429).json({ message: `Daily limit of ${DAILY_LIMIT} emails reached. Try again tomorrow.` });
    return;
  }

  // De-duplicate: exclude already-sent emails
  const alreadySent = new Set(
    (await EmailLog.distinct('recipientEmail', { status: 'sent' })).map((e: string) => e.toLowerCase())
  );

  const toSend = recipients
    .filter((r) => r.email && !alreadySent.has(r.email.toLowerCase()))
    .slice(0, remaining); // enforce daily limit

  if (toSend.length === 0) {
    res.status(400).json({ message: 'All selected recipients have already been emailed.' });
    return;
  }

  // Load Gmail settings
  const settings = await EmailSettings.findOne({ planType: 'professional' });
  if (!settings?.gmailUser || !settings?.gmailAppPassword) {
    res.status(400).json({ message: 'Professional email settings are not configured.' });
    return;
  }

  const jobId = Math.random().toString(36).slice(2) + Date.now();
  const job: Job = {
    id: jobId,
    total: toSend.length,
    current: 0,
    sent: 0,
    failed: 0,
    errors: [],
    status: 'running',
    startedAt: new Date(),
  };
  jobs.set(jobId, job);

  res.json({ jobId, total: toSend.length, skipped: recipients.length - toSend.length });

  // ── Background processing ──────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: POOL_CONNECTIONS,
    maxMessages: Infinity,
    service: 'gmail',
    auth: { user: settings.gmailUser, pass: settings.gmailAppPassword },
  });

  const nodemailerAttachments = (attachments || []).map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, 'base64'),
    contentType: a.contentType,
  }));

  const htmlWithNote = attachments?.length
    ? html + `<p style="margin:16px 0 0;color:#374151;font-size:14px;font-family:Arial,sans-serif;">Please find my resume attached below.</p>`
    : html;

  const sendOne = async (recipient: typeof toSend[0]) => {
    try {
      await transporter.sendMail({
        from: `"${settings.fromName || 'AI Companies'}" <${settings.gmailUser}>`,
        to: recipient.email,
        subject,
        html: htmlWithNote,
        attachments: nodemailerAttachments,
      });
      await EmailLog.create({
        companyId: recipient.companyId,
        companyName: recipient.companyName,
        recipientEmail: recipient.email.toLowerCase(),
        subject,
        status: 'sent',
        sentAt: new Date(),
      });
      const j = jobs.get(jobId)!;
      j.sent++;
    } catch (err: any) {
      try {
        await EmailLog.create({
          companyId: recipient.companyId,
          companyName: recipient.companyName,
          recipientEmail: recipient.email.toLowerCase(),
          subject,
          status: 'failed',
          sentAt: new Date(),
          errorMessage: err.message,
        });
      } catch (_e) {}
      try {
        console.log('[BulkEmail] Marking inactive, companyId:', recipient.companyId);
        const result = await Company.updateOne(
          { _id: new mongoose.Types.ObjectId(recipient.companyId) },
          { $set: { isActive: false } }
        );
        console.log('[BulkEmail] updateOne result:', JSON.stringify(result));
      } catch (_e: any) {
        console.error('[BulkEmail] updateOne error:', _e.message);
      }
      const j = jobs.get(jobId)!;
      j.failed++;
      j.errors.push(`${recipient.companyName}: ${err.message}`);
    } finally {
      const j = jobs.get(jobId)!;
      j.current++;
    }
  };

  (async () => {
    await Promise.allSettled(toSend.map(sendOne));
    transporter.close();
    jobs.get(jobId)!.status = 'completed';
  })();
};

// ─── GET /job/:jobId ──────────────────────────────────────────────────────────
export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }
  res.json(job);
};
