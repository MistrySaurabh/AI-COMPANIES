import { Request, Response } from 'express';
import City from '../models/City';

export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const stateId = (req.query.stateId as string) || '';
    const isActive = req.query.isActive as string;
    const sortField = (req.query.sortField as string) || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const query: Record<string, unknown> = {};

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { stateName: { $regex: search, $options: 'i' } },
        { stateCode: { $regex: search, $options: 'i' } },
      ];
    }
    if (stateId) query['stateId'] = stateId;
    if (isActive === 'true') query['isActive'] = true;
    if (isActive === 'false') query['isActive'] = false;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [cities, total] = await Promise.all([
      City.find(query).sort(sort).skip(skip).limit(limit).lean(),
      City.countDocuments(query),
    ]);

    res.json({
      data: cities,
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

export const getCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = await City.findById(req.params.id).lean();
    if (!city) {
      res.status(404).json({ message: 'City not found' });
      return;
    }
    res.json(city);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = new City(req.body);
    await city.save();
    res.status(201).json(city);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === '11000') {
      res.status(400).json({ message: 'City already exists in this state' });
      return;
    }
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const updateCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!city) {
      res.status(404).json({ message: 'City not found' });
      return;
    }
    res.json(city);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const deleteCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      res.status(404).json({ message: 'City not found' });
      return;
    }
    res.json({ message: 'City deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const toggleCityStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      res.status(404).json({ message: 'City not found' });
      return;
    }
    city.isActive = !city.isActive;
    await city.save();
    res.json(city);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
