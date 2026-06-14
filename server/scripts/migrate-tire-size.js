/**
 * One-time migration: split inventory.tire_size ("215/45-17")
 * into tire_width ("215"), tire_aspect ("45"), tire_rim ("17").
 *
 * Usage:
 *   node --env-file=.env server/scripts/migrate-tire-size.js           # dry run (safe)
 *   node --env-file=.env server/scripts/migrate-tire-size.js --apply   # write to DB
 */

import { MongoClient } from 'mongodb';

const DRY_RUN = !process.argv.includes('--apply');

function parseTireSize(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Matches: "215/45-17", "215/45R17", "215/45 R17"
  const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)\s*[-R\s]\s*(\d+)$/i);
  if (!m) return null;
  return { tire_width: m[1], tire_aspect: m[2], tire_rim: m[3] };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'tiretrack';
  if (!uri) throw new Error('MONGODB_URI is not set');

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection('inventory');

  const docs = await col.find({}).toArray();
  console.log(`Found ${docs.length} inventory documents`);
  console.log(DRY_RUN ? '--- DRY RUN (no writes) ---' : '--- APPLYING MIGRATION ---');

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    // Already migrated — idempotent skip
    if (doc.tire_width !== undefined) {
      console.log(`  SKIP (already migrated): ${doc._id}`);
      skipped++;
      continue;
    }

    const parsed = parseTireSize(doc.tire_size);
    if (!parsed) {
      console.error(`  FAIL (cannot parse): ${doc._id}  tire_size="${doc.tire_size}"`);
      failed++;
      continue;
    }

    console.log(`  ${DRY_RUN ? 'WOULD MIGRATE' : 'MIGRATING'}: "${doc.tire_size}" → ${parsed.tire_width}/${parsed.tire_aspect}R${parsed.tire_rim}`);

    if (!DRY_RUN) {
      await col.updateOne(
        { _id: doc._id },
        {
          $set: { tire_width: parsed.tire_width, tire_aspect: parsed.tire_aspect, tire_rim: parsed.tire_rim },
          $unset: { tire_size: '' }
        }
      );
    }
    migrated++;
  }

  console.log(`\nResult: ${migrated} ${DRY_RUN ? 'to migrate' : 'migrated'}, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) {
    console.error('Some documents could not be parsed. Fix them manually before running --apply.');
    process.exit(1);
  }

  await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });
