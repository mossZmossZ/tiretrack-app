import { v4 as uuidv4 } from 'uuid';
import { Inventory } from '../models/Inventory.model.js';

const HEADERS = ['id', 'tire_brand', 'tire_size', 'tire_model', 'cost_price', 'created_at'];
const HEADER_LINE = HEADERS.join(',');

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        values.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  values.push(current);
  return values;
}

function toRecord({ _id, __v, ...rest }) {
  return { id: _id, ...rest };
}

export async function readAll() {
  const docs = await Inventory.find({}).lean();
  return docs.map(toRecord);
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
  await Inventory.create(record);
  return toRecord(record);
}

export async function findById(id) {
  const doc = await Inventory.findById(id).lean();
  return doc ? toRecord(doc) : null;
}

export async function updateById(id, updates) {
  const doc = await Inventory.findById(id).lean();
  if (!doc) return null;

  const merged = { ...doc, ...updates };
  delete merged._id;
  delete merged.__v;

  await Inventory.findByIdAndUpdate(id, merged);
  return toRecord({ _id: id, ...merged });
}

export async function deleteById(id) {
  const result = await Inventory.findByIdAndDelete(id);
  return result !== null;
}

// Export all inventory as CSV string
export async function getCSVContent() {
  const all = await readAll();
  const lines = [HEADER_LINE];
  all.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  return lines.join('\n') + '\n';
}

function cleanNone(val) {
  if (!val) return '';
  const cleaned = val.trim();
  if (cleaned === 'none' || cleaned === 'None' || cleaned === 'NONE') return '';
  return cleaned;
}

// Import legacy inventory CSV (tire_brand, tire_size, tire_model, cost_price)
export async function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.includes('ยี่ห้อ') || line.includes('tire_brand')) continue;

    const values = line.includes('\t')
      ? line.split('\t').map(v => v.trim())
      : parseCSVLine(line);

    if (values.length < 2) { skipped++; continue; }

    try {
      const tire_brand = cleanNone(values[0]?.trim() || '');
      const tire_size = cleanNone(values[1]?.trim() || '');
      const tire_model = cleanNone(values[2]?.trim() || '');

      let cost_price = '0';
      if (values[3]) {
        const cleaned = cleanNone(values[3].replace(/[,฿\s]/g, '').trim());
        if (cleaned && !isNaN(Number(cleaned))) {
          cost_price = cleaned;
        }
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

// Used by backup restore: clear collection and reimport from current-format CSV
export async function importCurrentCSV(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  await Inventory.deleteMany({});
  if (lines.length <= 1) return;

  const docs = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    HEADERS.forEach((h, idx) => { record[h] = values[idx] || ''; });
    if (!record.id) continue;
    docs.push({
      _id: record.id,
      tire_brand: record.tire_brand,
      tire_size: record.tire_size,
      tire_model: record.tire_model,
      cost_price: record.cost_price,
      created_at: record.created_at
    });
  }

  if (docs.length > 0) {
    await Inventory.insertMany(docs, { ordered: false });
  }
}
