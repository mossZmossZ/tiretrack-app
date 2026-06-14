/**
 * Clears all service history records from MongoDB.
 *
 * Usage:
 *   cd server
 *   node scripts/clear-history.js
 *
 * Requires MONGODB_URI in ../.env.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const serviceSchema = new mongoose.Schema({ _id: String }, { strict: false });
const Service = mongoose.model('Service', serviceSchema);

async function clear() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiretrack';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);

  const count = await Service.countDocuments();
  console.log(`Found ${count} service records.`);

  if (count > 0) {
    const result = await Service.deleteMany({});
    console.log(`Deleted ${result.deletedCount} service records.`);
  } else {
    console.log('Nothing to delete.');
  }

  await mongoose.disconnect();
  console.log('Done. Service history cleared.');
}

clear().catch((err) => {
  console.error('Clear failed:', err.message);
  process.exit(1);
});
