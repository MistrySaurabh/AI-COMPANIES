import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import Company from '../models/Company';
import City from '../models/City';
import State from '../models/State';

interface ExcelRow {
  companyName: string;
  address: string;
  website: string;
  emailRaw: string;  // raw column — may contain multiple emails separated by ; or /
  coreServicesDomain: string;
  contactNumber: string;
  contactNumber2: string;
  city: string;
  state: string;
}

// Normalise header names from the Excel sheet
function normaliseHeader(raw: string): keyof ExcelRow | null {
  const map: Record<string, keyof ExcelRow> = {
    'company name': 'companyName',
    'company': 'companyName',
    'address': 'address',
    'address-area': 'address',
    'area': 'address',
    'website': 'website',
    'hr email': 'emailRaw',
    'email address': 'emailRaw',
    'email': 'emailRaw',
    'core services & domain': 'coreServicesDomain',
    'core services': 'coreServicesDomain',
    'domain': 'coreServicesDomain',
    'contact number': 'contactNumber',
    'contact': 'contactNumber',
    'phone': 'contactNumber',
    'contact number 2': 'contactNumber2',
    'contact 2': 'contactNumber2',
    'phone 2': 'contactNumber2',
    'alternate contact': 'contactNumber2',
    'city': 'city',
    'state': 'state',
  };
  return map[raw.toLowerCase().trim()] ?? null;
}

// Parse a raw email cell into individual addresses (split on ; or /)
function parseEmails(raw: string): string[] {
  return raw
    .split(/[;\/]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

// Assign emails to hrEmail / email fields:
// - email whose local part starts with "hr" goes to hrEmail
// - fallback: first email → hrEmail, second → email
function assignEmails(emails: string[]): { hrEmail: string | null; email: string | null } {
  const hrIndex = emails.findIndex((e) => /^hr[^@]*@/i.test(e));
  if (hrIndex !== -1) {
    const hrEmail = emails[hrIndex];
    const email = emails.find((_, i) => i !== hrIndex) || null;
    return { hrEmail, email };
  }
  return { hrEmail: emails[0] || null, email: emails[1] || null };
}

// Extract website domain from an email address
function domainFromEmail(email: string): string {
  const domain = email.split('@')[1];
  return domain ? `https://${domain}` : '';
}

export const importCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      res.status(400).json({ message: 'Excel sheet is empty' });
      return;
    }

    // Map raw column headers to our field names
    const rows: ExcelRow[] = rawRows.map((raw) => {
      const mapped: Partial<ExcelRow> = {};
      for (const [key, val] of Object.entries(raw)) {
        const field = normaliseHeader(key);
        if (field) mapped[field] = String(val).trim();
      }
      return mapped as ExcelRow;
    });

    // Pre-load all active cities and states into maps for fast lookup (case-insensitive)
    const [allCities, allStates] = await Promise.all([
      City.find({ isActive: true }).select('_id name stateName').lean(),
      State.find({ isActive: true }).select('_id name').lean(),
    ]);

    const cityMap = new Map(allCities.map((c) => [c.name.toLowerCase(), c]));
    const stateMap = new Map(allStates.map((s) => [s.name.toLowerCase(), s]));

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based + header row

      if (!row.companyName) {
        results.errors.push(`Row ${rowNum}: Missing company name — skipped`);
        results.skipped++;
        continue;
      }

      // Lookup city and state
      const cityDoc = row.city ? cityMap.get(row.city.toLowerCase()) : undefined;
      const stateDoc = row.state ? stateMap.get(row.state.toLowerCase()) : undefined;

      if (row.city && !cityDoc) {
        results.errors.push(`Row ${rowNum} (${row.companyName}): City "${row.city}" not found in database`);
      }
      if (row.state && !stateDoc) {
        results.errors.push(`Row ${rowNum} (${row.companyName}): State "${row.state}" not found in database`);
      }

      // Parse emails and assign based on prefix (hr* → hrEmail, other → email)
      const parsedEmails = parseEmails(row.emailRaw || '');
      const { hrEmail, email } = assignEmails(parsedEmails);

      // Derive website from first email domain if not provided
      const website = row.website || (hrEmail ? domainFromEmail(hrEmail) : '');

      // Check for duplicate by hrEmail (if provided) OR company name
      const orConditions: object[] = [
        { companyName: { $regex: `^${row.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ];
      if (hrEmail) orConditions.push({ hrEmail });

      const existing = await Company.findOne({ $or: orConditions });
      if (existing) {
        const reason = hrEmail && existing.hrEmail === hrEmail
          ? `email "${hrEmail}" already exists`
          : `company "${row.companyName}" already exists`;
        results.errors.push(`Row ${rowNum}: Duplicate — ${reason} — skipped`);
        results.skipped++;
        continue;
      }

      try {
        await Company.create({
          companyName: row.companyName,
          address: row.address || '-',
          website,
          hrEmail,
          email,
          coreServicesDomain: row.coreServicesDomain || null,
          contactNumber: row.contactNumber || null,
          contactNumber2: row.contactNumber2 || null,
          city: cityDoc ? cityDoc.name : row.city || null,
          cityId: cityDoc ? cityDoc._id : null,
          state: stateDoc ? stateDoc.name : row.state || null,
          stateId: stateDoc ? stateDoc._id : null,
        });
        results.inserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Row ${rowNum} (${row.companyName}): Failed to save — ${msg}`);
        results.skipped++;
      }
    }

    res.json({
      message: `Import complete: ${results.inserted} inserted, ${results.skipped} skipped`,
      ...results,
    });
  } catch (error) {
    res.status(500).json({ message: 'Import failed', error });
  }
};
