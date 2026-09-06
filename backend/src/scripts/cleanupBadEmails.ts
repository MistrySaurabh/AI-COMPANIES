/**
 * One-time script to remove junk emails from the companies collection.
 * Only removes emails whose domain TLD is a file extension (e.g. logo@2x.png).
 * Does NOT do domain-matching against the website — that is too aggressive for
 * existing records where email and website domains legitimately differ.
 *
 * Run with:
 *   npx ts-node src/scripts/cleanupBadEmails.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../models/Company';
import { JUNK_TLD } from '../controllers/placesController';

function isJunkEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1] || '';
  const local  = email.split('@')[0] || '';
  // Reject if TLD is a media/code file extension
  if (JUNK_TLD.test(domain)) return true;
  // Reject if the local part itself ends in a file extension (e.g. logo.png@...)
  if (JUNK_TLD.test(local)) return true;
  // Reject if domain has no alphabetic TLD at all
  if (!/\.[a-z]{2,}$/.test(domain)) return true;
  return false;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-companies';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const companies = await Company.find({
    $or: [
      { email:   { $nin: [null, ''] } },
      { hrEmail: { $nin: [null, ''] } },
    ],
  }).lean();

  console.log(`Scanning ${companies.length} companies with email data…\n`);

  let fixed = 0;

  for (const company of companies) {
    const updates: Record<string, unknown> = {};

    if (isJunkEmail(company.email as string | null)) {
      updates.email = null;
      console.log(`  ✗ email   cleared for "${company.companyName}": ${company.email}`);
    }

    if (isJunkEmail(company.hrEmail as string | null)) {
      updates.hrEmail = null;
      console.log(`  ✗ hrEmail cleared for "${company.companyName}": ${company.hrEmail}`);
    }

    if (Object.keys(updates).length > 0) {
      await Company.updateOne({ _id: company._id }, { $set: updates });
      fixed++;
    }
  }

  console.log(`\nDone. Cleaned up ${fixed} companies.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
