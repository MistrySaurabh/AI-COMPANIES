import { Request, Response } from 'express';
import EmailLog from '../models/EmailLog';

export const getEmailLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      search,
      dateFrom,
      dateTo,
      page = '1',
      limit = '25',
    } = req.query as Record<string, string>;

    const filter: any = {};

    if (status === 'sent' || status === 'failed') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { recipientEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.sentAt = {};
      if (dateFrom) filter.sentAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.sentAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limitNum).lean(),
      EmailLog.countDocuments(filter),
    ]);

    res.json({
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch email logs', error: error.message });
  }
};

export const deleteEmailLog = async (req: Request, res: Response): Promise<void> => {
  try {
    await EmailLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Log deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete log', error: error.message });
  }
};

export const clearEmailLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };
    const filter: any = {};
    if (status === 'sent' || status === 'failed') filter.status = status;
    const result = await EmailLog.deleteMany(filter);
    res.json({ deleted: result.deletedCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to clear logs', error: error.message });
  }
};
