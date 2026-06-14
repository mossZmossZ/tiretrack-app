/**
 * Clears all service history records from MongoDB.
 *
 * Usage:
 *   node --env-file=../.env scripts/clear-history.js           # dry run (safe)
 *   node --env-file=../.env scripts/clear-history.js --apply   # delete records
 */

import { MongoClient } from 'mongodb';

const DRY_RUN = !process.argv.includes('--apply');

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'tiretrack';
  if (!uri) throw new Error('MONGODB_URI is not set');

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection('services');

  const count = await col.countDocuments();
  console.log(`Found ${count} service records.`);
  console.log(DRY_RUN ? '--- DRY RUN (no writes) ---' : '--- DELETING ---');

  if (!DRY_RUN && count > 0) {
    const result = await col.deleteMany({});
    console.log(`Deleted ${result.deletedCount} service records.`);
  } else if (count === 0) {
    console.log('Nothing to delete.');
  }

  await client.close();
  console.log('Done.');
}

run().catch(err => { console.error('Clear failed:', err.message); process.exit(1); });
