/**
 * One-time migration: reads server/data/services.csv and server/data/inventory.csv
 * and inserts them into MongoDB.
 *
 * Usage:
 *   cd server
 *   node scripts/migrate-csv-to-mongo.js
 *
 * Requires MONGODB_URI in ../.env (or set it as an env var before running).
 * Safe to run multiple times — skips documents whose _id already exists.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATA_DIR = path.resolve(__dirname, '../data');

// ── Schemas (inline to keep script self-contained) ─────────────────────────

const serviceSchema = new mongoose.Schema({ _id: String }, { strict: false });
const inventorySchema = new mongoose.Schema({ _id: String }, { strict: false });

const Service = mongoose.model('Service', serviceSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);

// ── CSV helpers ─────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { values.push(current); current = ''; }
      else { current += ch; }
    }
  }
  values.push(current);
  return values;
}

function parseCsv(filePath, headers) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  if (lines.length <= 1) return [];
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((h, idx) => { record[h] = values[idx] || ''; });
    records.push(record);
  }
  return records;
}

// ── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiretrack';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);

  // Services
  const serviceHeaders = [
    'id', 'date', 'license_plate', 'province', 'car_model', 'car_color',
    'service_type', 'quantity', 'tire_brand', 'tire_model', 'tire_size',
    'price_per_unit', 'total_price', 'technician', 'notes', 'cost_price', 'created_at', 'created_by'
  ];
  const services = parseCsv(path.join(DATA_DIR, 'services.csv'), serviceHeaders);
  let sInserted = 0, sSkipped = 0;
  for (const record of services) {
    if (!record.id) { sSkipped++; continue; }
    const doc = { _id: record.id, ...record };
    delete doc.id;
    try {
      await Service.create(doc);
      sInserted++;
    } catch (err) {
      if (err.code === 11000) { sSkipped++; } // already exists
      else { console.error('Service insert error:', err.message); sSkipped++; }
    }
  }
  console.log(`Services: inserted=${sInserted}, skipped=${sSkipped}`);

  // Inventory
  const inventoryHeaders = ['id', 'tire_brand', 'tire_size', 'tire_model', 'cost_price', 'created_at'];
  const inventory = parseCsv(path.join(DATA_DIR, 'inventory.csv'), inventoryHeaders);
  let iInserted = 0, iSkipped = 0;
  for (const record of inventory) {
    if (!record.id) { iSkipped++; continue; }
    const doc = { _id: record.id, ...record };
    delete doc.id;
    try {
      await Inventory.create(doc);
      iInserted++;
    } catch (err) {
      if (err.code === 11000) { iSkipped++; }
      else { console.error('Inventory insert error:', err.message); iSkipped++; }
    }
  }
  console.log(`Inventory: inserted=${iInserted}, skipped=${iSkipped}`);

  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
