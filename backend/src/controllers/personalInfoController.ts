import { Request, Response } from 'express';
import PersonalInfo from '../models/PersonalInfo';

export const getPersonalInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    let info = await PersonalInfo.findOne();
    if (!info) info = await PersonalInfo.create({});
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch personal info', error: error.message });
  }
};

export const upsertPersonalInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await PersonalInfo.findOne();
    let info;
    if (existing) {
      info = await PersonalInfo.findByIdAndUpdate(existing._id, { $set: req.body }, { new: true, runValidators: true });
    } else {
      info = await PersonalInfo.create(req.body);
    }
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save personal info', error: error.message });
  }
};
