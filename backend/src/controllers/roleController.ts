import { Request, Response } from 'express';
import Role from '../models/Role';

export const getRoles = async (req: Request, res: Response): Promise<void> => {
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
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive === 'true') query['isActive'] = true;
    if (isActive === 'false') query['isActive'] = false;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [roles, total] = await Promise.all([
      Role.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Role.countDocuments(query),
    ]);

    res.json({
      data: roles,
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

export const getRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await Role.findById(req.params.id).lean();
    if (!role) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === '11000') {
      res.status(400).json({ message: 'Role with this name already exists' });
      return;
    }
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!role) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }
    res.json(role);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }
    res.json({ message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const toggleRoleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }
    role.isActive = !role.isActive;
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
