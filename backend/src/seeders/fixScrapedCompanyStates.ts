import mongoose from 'mongoose';
import dotenv from 'dotenv';
import City from '../models/City';
import ScrapedCompany from '../models/ScrapedCompany';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-companies';

async function fixScrapedCompanyStates() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Fetch all scraped companies that have a city
  const companies = await ScrapedCompany.find({
    city: { $exists: true, $ne: '' },
  }).select('_id companyName city state');

  console.log(`Found ${companies.length} scraped companies with city data`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const company of companies) {
    const cityName = company.city?.trim();
    if (!cityName) {
      skipped++;
      continue;
    }

    // Case-insensitive city lookup
    const cityDoc = await City.findOne({
      name: { $regex: new RegExp(`^${cityName}$`, 'i') },
      isActive: true,
    });

    if (!cityDoc) {
      console.log(`  [NOT FOUND] "${cityName}" — company: ${company.companyName}`);
      notFound++;
      continue;
    }

    const correctState = cityDoc.stateName;

    // Skip if state is already correct (case-insensitive compare)
    if (company.state?.trim().toLowerCase() === correctState.toLowerCase()) {
      skipped++;
      continue;
    }

    console.log(
      `  [FIX] ${company.companyName} | city: ${cityName} | wrong state: "${company.state}" → correct: "${correctState}"`
    );

    await ScrapedCompany.updateOne(
      { _id: company._id },
      { $set: { state: correctState } }
    );

    updated++;
  }

  console.log('\n--- Summary ---');
  console.log(`Total companies processed : ${companies.length}`);
  console.log(`Updated (wrong state fixed): ${updated}`);
  console.log(`Skipped (already correct)  : ${skipped}`);
  console.log(`City not found in DB       : ${notFound}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

fixScrapedCompanyStates().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
