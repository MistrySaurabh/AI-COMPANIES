import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import Company from '../models/Company';
import State from '../models/State';
import City from '../models/City';

export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const city = (req.query.city as string) || '';
    const state = (req.query.state as string) || '';
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const isActive = req.query.isActive as string;

    const query: Record<string, unknown> = {};

    if (search) {
      query['$or'] = [
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { hrEmail: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { coreServicesDomain: { $regex: search, $options: 'i' } },
      ];
    }
    if (city) query['city'] = { $regex: city, $options: 'i' };
    if (state) query['state'] = { $regex: state, $options: 'i' };
    if (isActive === 'true') query['isActive'] = true;
    else if (isActive === 'false') query['isActive'] = { $ne: true };

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Push nulls to the end regardless of sort direction for nullable fields
    const nullableFields = ['hrEmail'];
    const pipeline = nullableFields.includes(sortField)
      ? [
          { $match: query },
          { $addFields: { _nullSort: { $cond: [{ $ifNull: [`$${sortField}`, false] }, 0, 1] } } },
          { $sort: { _nullSort: 1, [sortField]: sortOrder } as Record<string, 1 | -1> },
          { $skip: skip },
          { $limit: limit },
        ]
      : null;

    const [companies, total] = await Promise.all([
      pipeline
        ? Company.aggregate(pipeline)
        : Company.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Company.countDocuments(query),
    ]);

    res.json({
      data: companies,
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

export const getCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = new Company(req.body);
    await company.save();
    res.status(201).json(company);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 11000) {
      res.status(400).json({ message: 'Duplicate entry' });
      return;
    }
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }
    res.json(company);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error });
  }
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const bulkDeleteCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'ids array is required' });
      return;
    }
    const result = await Company.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} companies deleted`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const exportCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';
    const city = (req.query.city as string) || '';
    const state = (req.query.state as string) || '';

    const query: Record<string, unknown> = {};
    if (search) {
      query['$or'] = [
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { hrEmail: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { coreServicesDomain: { $regex: search, $options: 'i' } },
      ];
    }
    if (city) query['city'] = { $regex: city, $options: 'i' };
    if (state) query['state'] = { $regex: state, $options: 'i' };

    const companies = await Company.find(query).sort({ companyName: 1 }).lean();

    const rows = companies.map((c, i) => ({
      '#': i + 1,
      'Company Name': c.companyName,
      'Address': c.address,
      'Website': c.website || '',
      'HR Email': c.hrEmail,
      'Email': c.email || '',
      'Core Services & Domain': c.coreServicesDomain || '',
      'Contact Number': c.contactNumber,
      'Contact Number 2': c.contactNumber2 || '',
      'City': c.city,
      'State': c.state,
      'Created At': new Date(c.createdAt).toLocaleDateString('en-IN'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 25 },
      { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Companies');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = [
      'companies',
      state ? `_${state.replace(/\s+/g, '-')}` : '',
      city ? `_${city.replace(/\s+/g, '-')}` : '',
      `_${new Date().toISOString().slice(0, 10)}`,
    ].join('') + '.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error });
  }
};

export const downloadSampleImport = (_req: Request, res: Response): void => {
  const rows = [
    {
      'Company Name': 'Acme Corp',
      'Address': '123 Main St, Suite 100',
      'Website': 'https://acme.com',
      'Email': 'hr@acme.com; info@acme.com  OR  hr@acme.com / info@acme.com',
      'Core Services & Domain': 'IT Services, Consulting',
      'Contact Number': '+1 234 567 8900',
      'Contact Number 2': '+1 234 567 8901',
      'City': 'Mumbai',
      'State': 'Maharashtra',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 38 },
    { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="company-import-sample.xlsx"');
  res.send(buffer);
};

export const toggleCompanyActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) { res.status(404).json({ message: 'Company not found' }); return; }
    const updated = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive: !company.isActive },
      { new: true }
    ).lean();
    res.json({ isActive: (updated as any).isActive });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getFilterOptions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [states, cities] = await Promise.all([
      State.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
      City.find({ isActive: true }).select('name stateName').sort({ name: 1 }).lean(),
    ]);
    res.json({
      states: states.map((s) => s.name),
      cities: cities.map((c) => ({ name: c.name, stateName: c.stateName })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
