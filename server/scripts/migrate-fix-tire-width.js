/**
 * Fixes inventory records where the import stored the full raw size string
 * (e.g. "195-14") in tire_width and left tire_rim empty.
 *
 * Targets records where tire_rim is empty and tire_width looks like a raw size.
 *
 * Usage:
 *   node --env-file=.env server/scripts/migrate-fix-tire-width.js           # dry run
 *   node --env-file=.env server/scripts/migrate-fix-tire-width.js --apply   # write to DB
 */

import { MongoClient } from 'mongodb';

const DRY_RUN = !process.argv.includes('--apply');

function parseTireSize(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  // With aspect ratio, slash separator: "215/70-15", "215/70R15"
  const m1 = s.match(/^(\d+)\s*\/\s*(\d+)\s*[-R\s]\s*(\d+)$/i);
  if (m1) return { tire_width: m1[1], tire_aspect: m1[2], tire_rim: m1[3] };
  // With aspect ratio, all-dash: "265-60-18"
  const m3 = s.match(/^(\d+)-(\d+)-(\d+)$/);
  if (m3) return { tire_width: m3[1], tire_aspect: m3[2], tire_rim: m3[3] };
  // Without aspect ratio: "195-14", "750-16", "750R16"
  const m2 = s.match(/^(\d+)\s*[-R]\s*(\d+)$/i);
  if (m2) return { tire_width: m2[1], tire_aspect: '', tire_rim: m2[2] };
  return null;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'tiretrack';
  if (!uri) throw new Error('MONGODB_URI is not set');

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection('inventory');

  // Only target records with empty tire_rim — these were mis-imported
  const docs = await col.find({ tire_rim: '' }).toArray();
  console.log(`Found ${docs.length} records with empty tire_rim`);
  console.log(DRY_RUN ? '--- DRY RUN (no writes) ---' : '--- APPLYING MIGRATION ---');

  let fixed = 0;
  let failed = 0;

  for (const doc of docs) {
    const parsed = parseTireSize(doc.tire_width);
    if (!parsed) {
      console.error(`  FAIL (cannot parse): ${doc._id}  tire_width="${doc.tire_width}"`);
      failed++;
      continue;
    }

    const display = parsed.tire_aspect
      ? `${parsed.tire_width}/${parsed.tire_aspect}R${parsed.tire_rim}`
      : `${parsed.tire_width}R${parsed.tire_rim}`;
    console.log(`  ${DRY_RUN ? 'WOULD FIX' : 'FIXING'}: "${doc.tire_width}" → ${display}  (${doc._id})`);

    if (!DRY_RUN) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { tire_width: parsed.tire_width, tire_aspect: parsed.tire_aspect, tire_rim: parsed.tire_rim } }
      );
    }
    fixed++;
  }

  console.log(`\nResult: ${fixed} ${DRY_RUN ? 'to fix' : 'fixed'}, ${failed} cannot parse`);
  if (failed > 0) {
    console.error('Records above could not be parsed — fix them manually.');
    process.exit(1);
  }

  await client.close();
  console.log('Done.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
