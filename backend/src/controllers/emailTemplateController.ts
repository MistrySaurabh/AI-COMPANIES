import { Request, Response } from 'express';
import EmailTemplate from '../models/EmailTemplate';

export const getEmailTemplates = async (_req: Request, res: Response) => {
  try {
    const templates = await EmailTemplate.find().sort({ createdAt: -1 }).lean();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const getEmailTemplate = async (req: Request, res: Response) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

export const createEmailTemplate = async (req: Request, res: Response) => {
  try {
    const template = new EmailTemplate(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create template' });
  }
};

export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const template = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update template' });
  }
};

export const deleteEmailTemplate = async (req: Request, res: Response) => {
  try {
    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete template' });
  }
};
