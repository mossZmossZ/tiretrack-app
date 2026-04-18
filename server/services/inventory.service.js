import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const CSV_PATH = path.join(DATA_DIR, 'inventory.csv');

const HEADERS = ['id', 'tire_brand', 'tire_size', 'tire_model', 'cost_price', 'created_at'];
const HEADER_LINE = HEADERS.join(',');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, HEADER_LINE + '\n', 'utf-8');
  }
}

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

export function readAll() {
  ensureFile();
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    HEADERS.forEach((h, idx) => {
      obj[h] = vals[idx] || '';
    });
    records.push(obj);
  }
  return records;
}

export function create(data) {
  ensureFile();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const record = {
    id,
    tire_brand: data.tire_brand || '',
    tire_size: data.tire_size || '',
    tire_model: data.tire_model || '',
    cost_price: data.cost_price || '0',
    created_at: now
  };

  const line = HEADERS.map(h => escapeCSV(record[h])).join(',');
  fs.appendFileSync(CSV_PATH, line + '\n', 'utf-8');
  return record;
}

export function findById(id) {
  const all = readAll();
  return all.find(r => r.id === id) || null;
}

export function updateById(id, updates) {
  ensureFile();
  const all = readAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], ...updates };

  const lines = [HEADER_LINE];
  all.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8');
  return all[idx];
}

export function deleteById(id) {
  ensureFile();
  const all = readAll();
  const authRecords = all.filter(r => r.id !== id);
  if (all.length === authRecords.length) return false;

  const lines = [HEADER_LINE];
  authRecords.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8');
  return true;
}

export function getCSVContent() {
  ensureFile();
  return fs.readFileSync(CSV_PATH, 'utf-8');
}

export function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('ยี่ห้อ') || line.includes('tire_brand')) {
      // skip header
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

      create({ tire_brand, tire_size, tire_model, cost_price });
      imported++;
    } catch (err) {
      skipped++;
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { imported, skipped, errors };
}
