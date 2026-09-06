import mongoose from 'mongoose';
import dotenv from 'dotenv';
import State from '../models/State';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-companies';

const indianStates = [
  // 28 States
  { name: 'Andhra Pradesh', code: 'AP', country: 'India' },
  { name: 'Arunachal Pradesh', code: 'AR', country: 'India' },
  { name: 'Assam', code: 'AS', country: 'India' },
  { name: 'Bihar', code: 'BR', country: 'India' },
  { name: 'Chhattisgarh', code: 'CT', country: 'India' },
  { name: 'Goa', code: 'GA', country: 'India' },
  { name: 'Gujarat', code: 'GJ', country: 'India' },
  { name: 'Haryana', code: 'HR', country: 'India' },
  { name: 'Himachal Pradesh', code: 'HP', country: 'India' },
  { name: 'Jharkhand', code: 'JH', country: 'India' },
  { name: 'Karnataka', code: 'KA', country: 'India' },
  { name: 'Kerala', code: 'KL', country: 'India' },
  { name: 'Madhya Pradesh', code: 'MP', country: 'India' },
  { name: 'Maharashtra', code: 'MH', country: 'India' },
  { name: 'Manipur', code: 'MN', country: 'India' },
  { name: 'Meghalaya', code: 'ML', country: 'India' },
  { name: 'Mizoram', code: 'MZ', country: 'India' },
  { name: 'Nagaland', code: 'NL', country: 'India' },
  { name: 'Odisha', code: 'OR', country: 'India' },
  { name: 'Punjab', code: 'PB', country: 'India' },
  { name: 'Rajasthan', code: 'RJ', country: 'India' },
  { name: 'Sikkim', code: 'SK', country: 'India' },
  { name: 'Tamil Nadu', code: 'TN', country: 'India' },
  { name: 'Telangana', code: 'TG', country: 'India' },
  { name: 'Tripura', code: 'TR', country: 'India' },
  { name: 'Uttar Pradesh', code: 'UP', country: 'India' },
  { name: 'Uttarakhand', code: 'UK', country: 'India' },
  { name: 'West Bengal', code: 'WB', country: 'India' },
  // 8 Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN', country: 'India' },
  { name: 'Chandigarh', code: 'CH', country: 'India' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN', country: 'India' },
  { name: 'Delhi', code: 'DL', country: 'India' },
  { name: 'Jammu and Kashmir', code: 'JK', country: 'India' },
  { name: 'Ladakh', code: 'LA', country: 'India' },
  { name: 'Lakshadweep', code: 'LD', country: 'India' },
  { name: 'Puducherry', code: 'PY', country: 'India' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  let inserted = 0;
  let skipped = 0;

  for (const s of indianStates) {
    const existing = await State.findOne({ name: s.name, country: s.country });
    if (existing) {
      skipped++;
      continue;
    }
    await State.create({ ...s, isActive: true });
    inserted++;
  }

  console.log(`Seeding complete: ${inserted} inserted, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
