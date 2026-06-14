/**
 * Clears all tire inventory records from MongoDB.
 *
 * Usage:
 *   cd server
 *   node scripts/clear-inventory.js
 *
 * Requires MONGODB_URI in ../.env.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const inventorySchema = new mongoose.Schema({ _id: String }, { strict: false });
const Inventory = mongoose.model('Inventory', inventorySchema);

async function clear() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiretrack';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);

  const count = await Inventory.countDocuments();
  console.log(`Found ${count} inventory records.`);

  if (count > 0) {
    const result = await Inventory.deleteMany({});
    console.log(`Deleted ${result.deletedCount} inventory records.`);
  } else {
    console.log('Nothing to delete.');
  }

  await mongoose.disconnect();
  console.log('Done. Inventory cleared.');
}

clear().catch((err) => {
  console.error('Clear failed:', err.message);
  process.exit(1);
});
