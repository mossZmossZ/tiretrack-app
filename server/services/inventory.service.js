import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { parseCSVLine, serializeRecords } from '../lib/csv.js';

const COLLECTION = 'inventory';

const HEADERS = ['id', 'tire_brand', 'tire_width', 'tire_aspect', 'tire_rim', 'tire_model', 'cost_price', 'created_at'];

export function parseTireSize(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  // With aspect ratio, slash separator: "215/70-15", "215/70R15", "215/70 R15"
  const m1 = s.match(/^(\d+)\s*\/\s*(\d+)\s*[-R\s]\s*(\d+)$/i);
  if (m1) return { tire_width: m1[1], tire_aspect: m1[2], tire_rim: m1[3] };
  // With aspect ratio, all-dash: "265-60-18"
  const m3 = s.match(/^(\d+)-(\d+)-(\d+)$/);
  if (m3) return { tire_width: m3[1], tire_aspect: m3[2], tire_rim: m3[3] };
  // LT/special cross-section: "31*10.5-15", "31x10.5-15"
  const m4 = s.match(/^(\d+[*xX]\d+\.?\d*)\s*[-R]\s*(\d+)$/i);
  if (m4) return { tire_width: m4[1], tire_aspect: '', tire_rim: m4[2] };
  // Without aspect ratio: "195-14", "750-16", "750R16"
  const m2 = s.match(/^(\d+)\s*[-R]\s*(\d+)$/i);
  if (m2) return { tire_width: m2[1], tire_aspect: '', tire_rim: m2[2] };
  return null;
}

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
    tire_width: data.tire_width || '',
    tire_aspect: data.tire_aspect || '',
    tire_rim: data.tire_rim || '',
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
      const rawSize = values[1]?.trim() || '';
      const tire_model = values[2]?.trim() || '';
      let cost_price = '0';
      if (values[3]) {
        cost_price = values[3].replace(/[,฿\s]/g, '').trim();
      }

      const parsed = parseTireSize(rawSize);
      const sizeFields = parsed
        ? { tire_width: parsed.tire_width, tire_aspect: parsed.tire_aspect, tire_rim: parsed.tire_rim }
        : { tire_width: rawSize, tire_aspect: '', tire_rim: '' };

      await create({ tire_brand, ...sizeFields, tire_model, cost_price });
      imported++;
    } catch (err) {
      skipped++;
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}

export const INVENTORY_HEADERS = HEADERS;
