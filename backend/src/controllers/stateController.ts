import { Request, Response } from 'express';
import State from '../models/State';

export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const isActive = req.query.isActive as string;
    const sortField = (req.query.sortField as string) || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const query: Record<string, unknown> = {};

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive === 'true') query['isActive'] = true;
    if (isActive === 'false') query['isActive'] = false;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [states, total] = await Promise.all([
      State.find(query).sort(sort).skip(skip).limit(limit).lean(),
      State.countDocuments(query),
    ]);

    res.json({
      data: states,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getState = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await State.findById(req.params.id).lean();
    if (!state) {
      res.status(404).json({ message: 'State not found' });
      return;
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createState = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = new State(req.body);
    await state.save();
    res.status(201).json(state);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === '11000') {
      res.status(400).json({ message: 'State with this name already exists for this country' });
      return;
    }
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const updateState = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await State.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!state) {
      res.status(404).json({ message: 'State not found' });
      return;
    }
    res.json(state);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const deleteState = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await State.findByIdAndDelete(req.params.id);
    if (!state) {
      res.status(404).json({ message: 'State not found' });
      return;
    }
    res.json({ message: 'State deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const toggleStateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) {
      res.status(404).json({ message: 'State not found' });
      return;
    }
    state.isActive = !state.isActive;
    await state.save();
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllActiveStates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const states = await State.find({ isActive: true }).select('_id name code').sort({ name: 1 }).lean();
    res.json(states);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
