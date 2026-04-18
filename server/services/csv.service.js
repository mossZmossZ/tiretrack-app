import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const CSV_PATH = path.join(DATA_DIR, 'services.csv');

const HEADERS = [
  'id', 'date', 'license_plate', 'province', 'car_model', 'car_color',
  'service_type', 'quantity', 'tire_brand', 'tire_model', 'tire_size',
  'price_per_unit', 'total_price', 'technician', 'notes', 'cost_price', 'created_at', 'created_by'
];

const HEADER_LINE = HEADERS.join(',');

// Ensure data directory and CSV file exist
function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, HEADER_LINE + '\n', 'utf-8');
  }
}

// Escape CSV value (handle commas, quotes, newlines)
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Parse a CSV line handling quoted values
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

// Read all records from CSV
export function readAll() {
  ensureFile();
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return [];

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    HEADERS.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  return records;
}

// Find by ID
export function findById(id) {
  const all = readAll();
  return all.find(r => r.id === id) || null;
}

// Search by license plate (partial match)
export function search(query) {
  if (!query) return readAll();
  const q = query.trim().toLowerCase();
  const all = readAll();
  return all.filter(r => r.license_plate.toLowerCase().includes(q));
}

// Create a new record
export function create(data, createdBy = 'tech') {
  ensureFile();
  const record = {
    id: uuidv4().slice(0, 8),
    date: data.date || new Date().toISOString().split('T')[0],
    license_plate: data.license_plate || '',
    province: data.province || '',
    car_model: data.car_model || '',
    car_color: data.car_color || '',
    service_type: data.service_type || 'tire_change',
    quantity: data.quantity || '',
    tire_brand: data.tire_brand || '',
    tire_model: data.tire_model || '',
    tire_size: data.tire_size || '',
    price_per_unit: data.price_per_unit || '',
    total_price: data.total_price || '0',
    technician: data.technician || '',
    notes: data.notes || '',
    cost_price: data.cost_price || '0',
    created_at: new Date().toISOString(),
    created_by: createdBy
  };

  // Auto-calculate total for tire_change if not provided
  if (record.service_type === 'tire_change' && record.quantity && record.price_per_unit && !data.total_price) {
    record.total_price = String(Number(record.quantity) * Number(record.price_per_unit));
  }

  const line = HEADERS.map(h => escapeCSV(record[h])).join(',');
  fs.appendFileSync(CSV_PATH, line + '\n', 'utf-8');
  return record;
}

// Delete by ID (for undo)
export function deleteById(id) {
  ensureFile();
  const all = readAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return false;

  const filtered = all.filter(r => r.id !== id);
  const lines = [HEADER_LINE];
  filtered.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8');
  return true;
}

// Update by ID
export function updateById(id, updates) {
  ensureFile();
  const all = readAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], ...updates };

  if (all[idx].service_type === 'tire_change' && all[idx].quantity && all[idx].price_per_unit) {
    all[idx].total_price = String(Number(all[idx].quantity) * Number(all[idx].price_per_unit));
  }

  const lines = [HEADER_LINE];
  all.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8');
  return all[idx];
}

// Get dashboard stats
export function getStats() {
  const all = readAll();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const todayRecords = all.filter(r => r.date === today);
  const weekRecords = all.filter(r => r.date >= weekAgo);
  const monthRecords = all.filter(r => r.date >= monthStart);

  // Service type breakdown
  const serviceBreakdown = {};
  all.forEach(r => {
    serviceBreakdown[r.service_type] = (serviceBreakdown[r.service_type] || 0) + 1;
  });

  // Top tire brands
  const brandCounts = {};
  all.filter(r => r.service_type === 'tire_change' && r.tire_brand).forEach(r => {
    brandCounts[r.tire_brand] = (brandCounts[r.tire_brand] || 0) + 1;
  });

  // Monthly revenue (last 12 months)
  const monthlyRevenue = {};
  all.forEach(r => {
    const month = r.date?.slice(0, 7); // YYYY-MM
    if (month) {
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(r.total_price || 0);
    }
  });

  const sumTotal = (records) => records.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const sumCost = (records) => records.reduce((s, r) => s + (Number(r.cost_price || 0) * Number(r.quantity || 1)), 0);
  const sumTires = (records) => records
    .filter(r => r.service_type === 'tire_change')
    .reduce((s, r) => s + Number(r.quantity || 0), 0);

  return {
    total: all.length,
    today: { count: todayRecords.length, revenue: sumTotal(todayRecords), cost: sumCost(todayRecords), profit: sumTotal(todayRecords) - sumCost(todayRecords), tires: sumTires(todayRecords) },
    week: { count: weekRecords.length, revenue: sumTotal(weekRecords), cost: sumCost(weekRecords), profit: sumTotal(weekRecords) - sumCost(weekRecords), tires: sumTires(weekRecords) },
    month: { count: monthRecords.length, revenue: sumTotal(monthRecords), cost: sumCost(monthRecords), profit: sumTotal(monthRecords) - sumCost(monthRecords), tires: sumTires(monthRecords) },
    serviceBreakdown,
    brandCounts,
    monthlyRevenue,
    recentRecords: all.slice(-10).reverse()
  };
}

// Import legacy CSV data
export function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return { imported: 0, skipped: 0, errors: [] };

  let imported = 0;
  let skipped = 0;
  const errors = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      // Legacy format: date, license_plate, car_model, car_color, quantity, tire_brand, tire_model, tire_size, price_per_unit, notes
      const dateRaw = values[0]?.trim();
      if (!dateRaw) { skipped++; continue; }

      // Parse D/M/YYYY to YYYY-MM-DD
      let date = dateRaw;
      const dateParts = dateRaw.split('/');
      if (dateParts.length === 3) {
        const [d, m, y] = dateParts;
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // Extract province from plate suffix
      const plateRaw = values[1]?.trim() || '';
      let plate = plateRaw;
      let province = '';
      if (plateRaw.endsWith('กทม')) {
        plate = plateRaw.slice(0, -3);
        province = 'กรุงเทพมหานคร';
      } else if (plateRaw.endsWith('พช')) {
        plate = plateRaw.slice(0, -2);
        province = 'เพชรบูรณ์';
      }

      const priceStr = (values[8] || '').replace(/[,฿\s]/g, '').trim();
      const price = Number(priceStr) || 0;
      const qty = Number(values[4]?.trim()) || 0;

      create({
        date,
        license_plate: plate || plateRaw,
        province,
        car_model: values[2]?.trim() || '',
        car_color: values[3]?.trim() || '',
        service_type: 'tire_change',
        quantity: String(qty),
        tire_brand: values[5]?.trim() || '',
        tire_model: values[6]?.trim() || '',
        tire_size: values[7]?.trim() || '',
        price_per_unit: String(price),
        total_price: String(qty * price),
        notes: values[9]?.trim() || ''
      }, 'admin');

      imported++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

// Export all as CSV string
export function exportAll() {
  ensureFile();
  return fs.readFileSync(CSV_PATH, 'utf-8');
}
