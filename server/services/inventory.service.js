import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { parseCSVLine, serializeRecords } from '../lib/csv.js';

const COLLECTION = 'inventory';

const HEADERS = ['id', 'tire_brand', 'tire_size', 'tire_model', 'cost_price', 'created_at'];

function collection() {
  return getDb().collection(COLLECTION);
}

function toApi(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const out = { id: _id };
  for (const h of HEADERS) {
    if (h === 'id') continue;
    out[h] = rest[h] ?? '';
  }
  return out;
}

export async function readAll() {
  const docs = await collection().find({}).toArray();
  return docs.map(toApi);
}

export async function findById(id) {
  const doc = await collection().findOne({ _id: id });
  return toApi(doc);
}

export async function create(data) {
  const id = uuidv4();
  const record = {
    _id: id,
    tire_brand: data.tire_brand || '',
    tire_size: data.tire_size || '',
    tire_model: data.tire_model || '',
    cost_price: data.cost_price || '0',
    created_at: new Date().toISOString()
  };
  await collection().insertOne(record);
  return toApi(record);
}

export async function updateById(id, updates) {
  const current = await collection().findOne({ _id: id });
  if (!current) return null;

  const merged = { ...current, ...updates };
  delete merged._id;
  await collection().updateOne({ _id: id }, { $set: merged });
  return toApi({ _id: id, ...merged });
}

export async function deleteById(id) {
  const res = await collection().deleteOne({ _id: id });
  return res.deletedCount === 1;
}

export async function getCSVContent() {
  const all = await readAll();
  return serializeRecords(HEADERS, all);
}

export async function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes('ยี่ห้อ') || line.includes('tire_brand')) {
      continue;
    }

    const values = line.includes('\t')
      ? line.split('\t').map(v => v.trim())
      : parseCSVLine(line);

    if (values.length < 2) {
      skipped++;
      continue;
    }

    try {
      const tire_brand = values[0]?.trim() || '';
      const tire_size = values[1]?.trim() || '';
      const tire_model = values[2]?.trim() || '';
      let cost_price = '0';
      if (values[3]) {
        cost_price = values[3].replace(/[,฿\s]/g, '').trim();
      }

      await create({ tire_brand, tire_size, tire_model, cost_price });
      imported++;
    } catch (err) {
      skipped++;
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}

export const INVENTORY_HEADERS = HEADERS;
