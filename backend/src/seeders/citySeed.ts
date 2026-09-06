import mongoose from 'mongoose';
import dotenv from 'dotenv';
import State from '../models/State';
import City from '../models/City';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-companies';

// Major cities of India mapped to state codes
const cityData: { name: string; stateCode: string }[] = [
  // Andhra Pradesh
  { name: 'Visakhapatnam', stateCode: 'AP' },
  { name: 'Vijayawada', stateCode: 'AP' },
  { name: 'Guntur', stateCode: 'AP' },
  { name: 'Nellore', stateCode: 'AP' },
  { name: 'Kurnool', stateCode: 'AP' },
  { name: 'Tirupati', stateCode: 'AP' },
  { name: 'Kakinada', stateCode: 'AP' },
  { name: 'Rajahmundry', stateCode: 'AP' },
  { name: 'Kadapa', stateCode: 'AP' },
  { name: 'Anantapur', stateCode: 'AP' },

  // Arunachal Pradesh
  { name: 'Itanagar', stateCode: 'AR' },
  { name: 'Naharlagun', stateCode: 'AR' },
  { name: 'Pasighat', stateCode: 'AR' },

  // Assam
  { name: 'Guwahati', stateCode: 'AS' },
  { name: 'Silchar', stateCode: 'AS' },
  { name: 'Dibrugarh', stateCode: 'AS' },
  { name: 'Jorhat', stateCode: 'AS' },
  { name: 'Nagaon', stateCode: 'AS' },
  { name: 'Tinsukia', stateCode: 'AS' },
  { name: 'Tezpur', stateCode: 'AS' },

  // Bihar
  { name: 'Patna', stateCode: 'BR' },
  { name: 'Gaya', stateCode: 'BR' },
  { name: 'Bhagalpur', stateCode: 'BR' },
  { name: 'Muzaffarpur', stateCode: 'BR' },
  { name: 'Purnia', stateCode: 'BR' },
  { name: 'Darbhanga', stateCode: 'BR' },
  { name: 'Bihar Sharif', stateCode: 'BR' },
  { name: 'Arrah', stateCode: 'BR' },
  { name: 'Begusarai', stateCode: 'BR' },
  { name: 'Katihar', stateCode: 'BR' },

  // Chhattisgarh
  { name: 'Raipur', stateCode: 'CT' },
  { name: 'Bhilai', stateCode: 'CT' },
  { name: 'Bilaspur', stateCode: 'CT' },
  { name: 'Korba', stateCode: 'CT' },
  { name: 'Durg', stateCode: 'CT' },
  { name: 'Rajnandgaon', stateCode: 'CT' },
  { name: 'Jagdalpur', stateCode: 'CT' },

  // Goa
  { name: 'Panaji', stateCode: 'GA' },
  { name: 'Margao', stateCode: 'GA' },
  { name: 'Vasco da Gama', stateCode: 'GA' },
  { name: 'Mapusa', stateCode: 'GA' },
  { name: 'Ponda', stateCode: 'GA' },

  // Gujarat
  { name: 'Ahmedabad', stateCode: 'GJ' },
  { name: 'Surat', stateCode: 'GJ' },
  { name: 'Vadodara', stateCode: 'GJ' },
  { name: 'Rajkot', stateCode: 'GJ' },
  { name: 'Bhavnagar', stateCode: 'GJ' },
  { name: 'Jamnagar', stateCode: 'GJ' },
  { name: 'Junagadh', stateCode: 'GJ' },
  { name: 'Gandhinagar', stateCode: 'GJ' },
  { name: 'Anand', stateCode: 'GJ' },
  { name: 'Navsari', stateCode: 'GJ' },
  { name: 'Morbi', stateCode: 'GJ' },
  { name: 'Mehsana', stateCode: 'GJ' },
  { name: 'Bharuch', stateCode: 'GJ' },

  // Haryana
  { name: 'Faridabad', stateCode: 'HR' },
  { name: 'Gurgaon', stateCode: 'HR' },
  { name: 'Panipat', stateCode: 'HR' },
  { name: 'Ambala', stateCode: 'HR' },
  { name: 'Yamunanagar', stateCode: 'HR' },
  { name: 'Rohtak', stateCode: 'HR' },
  { name: 'Hisar', stateCode: 'HR' },
  { name: 'Karnal', stateCode: 'HR' },
  { name: 'Sonipat', stateCode: 'HR' },
  { name: 'Panchkula', stateCode: 'HR' },

  // Himachal Pradesh
  { name: 'Shimla', stateCode: 'HP' },
  { name: 'Mandi', stateCode: 'HP' },
  { name: 'Solan', stateCode: 'HP' },
  { name: 'Dharamsala', stateCode: 'HP' },
  { name: 'Kullu', stateCode: 'HP' },
  { name: 'Manali', stateCode: 'HP' },

  // Jharkhand
  { name: 'Ranchi', stateCode: 'JH' },
  { name: 'Jamshedpur', stateCode: 'JH' },
  { name: 'Dhanbad', stateCode: 'JH' },
  { name: 'Bokaro', stateCode: 'JH' },
  { name: 'Deoghar', stateCode: 'JH' },
  { name: 'Hazaribagh', stateCode: 'JH' },
  { name: 'Giridih', stateCode: 'JH' },

  // Karnataka
  { name: 'Bengaluru', stateCode: 'KA' },
  { name: 'Mysuru', stateCode: 'KA' },
  { name: 'Hubballi', stateCode: 'KA' },
  { name: 'Mangaluru', stateCode: 'KA' },
  { name: 'Belagavi', stateCode: 'KA' },
  { name: 'Davanagere', stateCode: 'KA' },
  { name: 'Ballari', stateCode: 'KA' },
  { name: 'Vijayapura', stateCode: 'KA' },
  { name: 'Shivamogga', stateCode: 'KA' },
  { name: 'Tumakuru', stateCode: 'KA' },

  // Kerala
  { name: 'Thiruvananthapuram', stateCode: 'KL' },
  { name: 'Kochi', stateCode: 'KL' },
  { name: 'Kozhikode', stateCode: 'KL' },
  { name: 'Kollam', stateCode: 'KL' },
  { name: 'Thrissur', stateCode: 'KL' },
  { name: 'Malappuram', stateCode: 'KL' },
  { name: 'Kannur', stateCode: 'KL' },
  { name: 'Palakkad', stateCode: 'KL' },
  { name: 'Alappuzha', stateCode: 'KL' },
  { name: 'Kottayam', stateCode: 'KL' },

  // Madhya Pradesh
  { name: 'Indore', stateCode: 'MP' },
  { name: 'Bhopal', stateCode: 'MP' },
  { name: 'Jabalpur', stateCode: 'MP' },
  { name: 'Gwalior', stateCode: 'MP' },
  { name: 'Ujjain', stateCode: 'MP' },
  { name: 'Sagar', stateCode: 'MP' },
  { name: 'Dewas', stateCode: 'MP' },
  { name: 'Satna', stateCode: 'MP' },
  { name: 'Ratlam', stateCode: 'MP' },
  { name: 'Rewa', stateCode: 'MP' },

  // Maharashtra
  { name: 'Mumbai', stateCode: 'MH' },
  { name: 'Pune', stateCode: 'MH' },
  { name: 'Nagpur', stateCode: 'MH' },
  { name: 'Thane', stateCode: 'MH' },
  { name: 'Nashik', stateCode: 'MH' },
  { name: 'Aurangabad', stateCode: 'MH' },
  { name: 'Solapur', stateCode: 'MH' },
  { name: 'Amravati', stateCode: 'MH' },
  { name: 'Kolhapur', stateCode: 'MH' },
  { name: 'Navi Mumbai', stateCode: 'MH' },
  { name: 'Pimpri-Chinchwad', stateCode: 'MH' },
  { name: 'Akola', stateCode: 'MH' },
  { name: 'Latur', stateCode: 'MH' },
  { name: 'Dhule', stateCode: 'MH' },
  { name: 'Ahmednagar', stateCode: 'MH' },
  { name: 'Chandrapur', stateCode: 'MH' },
  { name: 'Jalgaon', stateCode: 'MH' },
  { name: 'Bhiwandi', stateCode: 'MH' },

  // Manipur
  { name: 'Imphal', stateCode: 'MN' },
  { name: 'Thoubal', stateCode: 'MN' },
  { name: 'Bishnupur', stateCode: 'MN' },

  // Meghalaya
  { name: 'Shillong', stateCode: 'ML' },
  { name: 'Tura', stateCode: 'ML' },
  { name: 'Nongstoin', stateCode: 'ML' },

  // Mizoram
  { name: 'Aizawl', stateCode: 'MZ' },
  { name: 'Lunglei', stateCode: 'MZ' },
  { name: 'Champhai', stateCode: 'MZ' },

  // Nagaland
  { name: 'Kohima', stateCode: 'NL' },
  { name: 'Dimapur', stateCode: 'NL' },
  { name: 'Mokokchung', stateCode: 'NL' },

  // Odisha
  { name: 'Bhubaneswar', stateCode: 'OR' },
  { name: 'Cuttack', stateCode: 'OR' },
  { name: 'Rourkela', stateCode: 'OR' },
  { name: 'Brahmapur', stateCode: 'OR' },
  { name: 'Sambalpur', stateCode: 'OR' },
  { name: 'Puri', stateCode: 'OR' },
  { name: 'Baripada', stateCode: 'OR' },

  // Punjab
  { name: 'Ludhiana', stateCode: 'PB' },
  { name: 'Amritsar', stateCode: 'PB' },
  { name: 'Jalandhar', stateCode: 'PB' },
  { name: 'Patiala', stateCode: 'PB' },
  { name: 'Bathinda', stateCode: 'PB' },
  { name: 'Mohali', stateCode: 'PB' },
  { name: 'Hoshiarpur', stateCode: 'PB' },
  { name: 'Firozpur', stateCode: 'PB' },

  // Rajasthan
  { name: 'Jaipur', stateCode: 'RJ' },
  { name: 'Jodhpur', stateCode: 'RJ' },
  { name: 'Kota', stateCode: 'RJ' },
  { name: 'Bikaner', stateCode: 'RJ' },
  { name: 'Ajmer', stateCode: 'RJ' },
  { name: 'Udaipur', stateCode: 'RJ' },
  { name: 'Bhilwara', stateCode: 'RJ' },
  { name: 'Sikar', stateCode: 'RJ' },
  { name: 'Alwar', stateCode: 'RJ' },
  { name: 'Barmer', stateCode: 'RJ' },

  // Sikkim
  { name: 'Gangtok', stateCode: 'SK' },
  { name: 'Namchi', stateCode: 'SK' },
  { name: 'Mangan', stateCode: 'SK' },

  // Tamil Nadu
  { name: 'Chennai', stateCode: 'TN' },
  { name: 'Coimbatore', stateCode: 'TN' },
  { name: 'Madurai', stateCode: 'TN' },
  { name: 'Tiruchirappalli', stateCode: 'TN' },
  { name: 'Salem', stateCode: 'TN' },
  { name: 'Tirunelveli', stateCode: 'TN' },
  { name: 'Vellore', stateCode: 'TN' },
  { name: 'Erode', stateCode: 'TN' },
  { name: 'Thoothukudi', stateCode: 'TN' },
  { name: 'Tirupur', stateCode: 'TN' },
  { name: 'Dindigul', stateCode: 'TN' },
  { name: 'Thanjavur', stateCode: 'TN' },

  // Telangana
  { name: 'Hyderabad', stateCode: 'TG' },
  { name: 'Warangal', stateCode: 'TG' },
  { name: 'Nizamabad', stateCode: 'TG' },
  { name: 'Karimnagar', stateCode: 'TG' },
  { name: 'Khammam', stateCode: 'TG' },
  { name: 'Mahbubnagar', stateCode: 'TG' },
  { name: 'Nalgonda', stateCode: 'TG' },
  { name: 'Adilabad', stateCode: 'TG' },
  { name: 'Secunderabad', stateCode: 'TG' },

  // Tripura
  { name: 'Agartala', stateCode: 'TR' },
  { name: 'Udaipur', stateCode: 'TR' },
  { name: 'Dharmanagar', stateCode: 'TR' },
  { name: 'Kailashahar', stateCode: 'TR' },

  // Uttar Pradesh
  { name: 'Lucknow', stateCode: 'UP' },
  { name: 'Kanpur', stateCode: 'UP' },
  { name: 'Ghaziabad', stateCode: 'UP' },
  { name: 'Agra', stateCode: 'UP' },
  { name: 'Meerut', stateCode: 'UP' },
  { name: 'Varanasi', stateCode: 'UP' },
  { name: 'Allahabad', stateCode: 'UP' },
  { name: 'Bareilly', stateCode: 'UP' },
  { name: 'Aligarh', stateCode: 'UP' },
  { name: 'Moradabad', stateCode: 'UP' },
  { name: 'Saharanpur', stateCode: 'UP' },
  { name: 'Gorakhpur', stateCode: 'UP' },
  { name: 'Firozabad', stateCode: 'UP' },
  { name: 'Noida', stateCode: 'UP' },
  { name: 'Jhansi', stateCode: 'UP' },
  { name: 'Mathura', stateCode: 'UP' },
  { name: 'Rampur', stateCode: 'UP' },
  { name: 'Shahjahanpur', stateCode: 'UP' },

  // Uttarakhand
  { name: 'Dehradun', stateCode: 'UK' },
  { name: 'Haridwar', stateCode: 'UK' },
  { name: 'Roorkee', stateCode: 'UK' },
  { name: 'Haldwani', stateCode: 'UK' },
  { name: 'Rudrapur', stateCode: 'UK' },
  { name: 'Kashipur', stateCode: 'UK' },
  { name: 'Rishikesh', stateCode: 'UK' },

  // West Bengal
  { name: 'Kolkata', stateCode: 'WB' },
  { name: 'Asansol', stateCode: 'WB' },
  { name: 'Siliguri', stateCode: 'WB' },
  { name: 'Durgapur', stateCode: 'WB' },
  { name: 'Bardhaman', stateCode: 'WB' },
  { name: 'Malda', stateCode: 'WB' },
  { name: 'Baharampur', stateCode: 'WB' },
  { name: 'Haora', stateCode: 'WB' },
  { name: 'Raiganj', stateCode: 'WB' },
  { name: 'Jalpaiguri', stateCode: 'WB' },

  // Andaman and Nicobar Islands
  { name: 'Port Blair', stateCode: 'AN' },

  // Chandigarh
  { name: 'Chandigarh', stateCode: 'CH' },

  // Dadra and Nagar Haveli and Daman and Diu
  { name: 'Daman', stateCode: 'DN' },
  { name: 'Silvassa', stateCode: 'DN' },

  // Delhi
  { name: 'New Delhi', stateCode: 'DL' },
  { name: 'Delhi', stateCode: 'DL' },
  { name: 'Dwarka', stateCode: 'DL' },
  { name: 'Rohini', stateCode: 'DL' },
  { name: 'Saket', stateCode: 'DL' },

  // Jammu and Kashmir
  { name: 'Srinagar', stateCode: 'JK' },
  { name: 'Jammu', stateCode: 'JK' },
  { name: 'Anantnag', stateCode: 'JK' },
  { name: 'Baramulla', stateCode: 'JK' },
  { name: 'Sopore', stateCode: 'JK' },

  // Ladakh
  { name: 'Leh', stateCode: 'LA' },
  { name: 'Kargil', stateCode: 'LA' },

  // Lakshadweep
  { name: 'Kavaratti', stateCode: 'LD' },

  // Puducherry
  { name: 'Puducherry', stateCode: 'PY' },
  { name: 'Karaikal', stateCode: 'PY' },
  { name: 'Mahe', stateCode: 'PY' },
  { name: 'Yanam', stateCode: 'PY' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Build stateCode -> state doc map
  const stateList = await State.find({ country: 'India' }).lean();
  const stateMap = new Map(stateList.map((s) => [s.code, s]));

  let inserted = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const city of cityData) {
    const state = stateMap.get(city.stateCode);
    if (!state) {
      missing.push(city.stateCode);
      continue;
    }

    const existing = await City.findOne({ name: city.name, stateId: state._id });
    if (existing) {
      skipped++;
      continue;
    }

    await City.create({
      name: city.name,
      stateId: state._id,
      stateName: state.name,
      stateCode: state.code,
      country: 'India',
      isActive: true,
    });
    inserted++;
  }

  if (missing.length > 0) {
    console.warn(`Missing states for codes: ${[...new Set(missing)].join(', ')} — run stateSeed.ts first`);
  }

  console.log(`Seeding complete: ${inserted} inserted, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
