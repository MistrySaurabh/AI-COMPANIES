import { Request, Response } from 'express';
import EmailSettings from '../models/EmailSettings';
import { checkAndProcessBounces } from '../services/bounceCheckerService';

export const processBounces = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await EmailSettings.findOne({ planType: 'professional' });

    if (!settings?.gmailUser || !settings?.gmailAppPassword) {
      res.status(400).json({ message: 'Professional email settings are not configured.' });
      return;
    }

    const result = await checkAndProcessBounces(settings.gmailUser, settings.gmailAppPassword);

    res.json({
      message: result.bounceEmailsFound === 0
        ? 'No unread bounce notifications found in Gmail inbox.'
        : `Processed ${result.bounceEmailsFound} bounce notification(s).`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to process bounces', error: error.message });
  }
};
