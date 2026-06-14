import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { parseCSVLine, serializeRecords } from '../lib/csv.js';

const COLLECTION = 'services';

function localDateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const HEADERS = [
  'id', 'date', 'license_plate', 'province', 'car_model', 'car_color',
  'service_type', 'quantity', 'tire_brand', 'tire_model', 'tire_size',
  'price_per_unit', 'total_price', 'technician', 'notes', 'cost_price', 'bill_id', 'created_at', 'created_by'
];

function collection() {
  return getDb().collection(COLLECTION);
}

// Rename internal _id to api-facing id. Output shape matches the CSV-era API.
function toApi(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const out = { id: _id };
  for (const h of HEADERS) {
    if (h === 'id') continue;
    out[h] = rest[h] ?? '';
  }
  out.parts = rest.parts || [];
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

export async function search(query) {
  if (!query) return readAll();
  const q = query.trim().toLowerCase();
  const docs = await collection().find({}).toArray();
  return docs
    .filter(r => (r.license_plate || '').toLowerCase().includes(q))
    .map(toApi);
}

export async function create(data, createdBy = 'tech') {
  const id = uuidv4().slice(0, 8);

  const record = {
    _id: id,
    date: data.date || localDateStr(),
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
    bill_id: data.bill_id || '',
    parts: data.parts || [],
    created_at: new Date().toISOString(),
    created_by: createdBy
  };

  if (record.service_type === 'tire_change' && record.quantity && record.price_per_unit && !data.total_price) {
    record.total_price = String(Number(record.quantity) * Number(record.price_per_unit));
  }
  if (record.service_type === 'part_change' && record.parts.length > 0 && !data.total_price) {
    record.total_price = String(record.parts.reduce((s, p) => s + Number(p.price_per_unit || 0) * Number(p.qty || 1), 0));
  }

  await collection().insertOne(record);
  return toApi(record);
}

export async function deleteById(id) {
  const res = await collection().deleteOne({ _id: id });
  return res.deletedCount === 1;
}

export async function findByBillId(billId) {
  const docs = await collection().find({ bill_id: billId }).toArray();
  return docs.map(toApi);
}

export async function deleteByBillId(billId) {
  await collection().deleteMany({ bill_id: billId });
}

export async function updateById(id, updates) {
  const current = await collection().findOne({ _id: id });
  if (!current) return null;

  const merged = { ...current, ...updates };
  if (merged.service_type === 'tire_change' && merged.quantity && merged.price_per_unit) {
    merged.total_price = String(Number(merged.quantity) * Number(merged.price_per_unit));
  }

  delete merged._id;
  await collection().updateOne({ _id: id }, { $set: merged });
  return toApi({ _id: id, ...merged });
}

export async function getStats() {
  const docs = await collection().find({}).toArray();
  const all = docs.map(toApi);

  const now = new Date();
  const today = localDateStr(now);
  const weekAgo = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const todayRecords = all.filter(r => r.date === today);
  const weekRecords = all.filter(r => r.date >= weekAgo);
  const monthRecords = all.filter(r => r.date >= monthStart);

  const serviceBreakdown = {};
  all.forEach(r => {
    serviceBreakdown[r.service_type] = (serviceBreakdown[r.service_type] || 0) + 1;
  });

  const brandCounts = {};
  all.filter(r => r.service_type === 'tire_change' && r.tire_brand).forEach(r => {
    brandCounts[r.tire_brand] = (brandCounts[r.tire_brand] || 0) + 1;
  });

  const monthlyRevenue = {};
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/;
  const maxYear = now.getFullYear() + 1;
  all.forEach(r => {
    const month = (r.date || '').slice(0, 7);
    const year = Number(month.slice(0, 4));
    if (validMonth.test(month) && year >= 2000 && year <= maxYear) {
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(r.total_price || 0);
    }
  });

  const sumTotal = (records) => records.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const sumCost = (records) => records.reduce((s, r) => s + (Number(r.cost_price || 0) * Number(r.quantity || 1)), 0);
  const sumTires = (records) => records
    .filter(r => r.service_type === 'tire_change')
    .reduce((s, r) => s + Number(r.quantity || 0), 0);

  const sortedAsc = [...all].sort((a, b) => (a.created_at || a.date).localeCompare(b.created_at || b.date));

  return {
    total: all.length,
    today: { count: todayRecords.length, revenue: sumTotal(todayRecords), cost: sumCost(todayRecords), profit: sumTotal(todayRecords) - sumCost(todayRecords), tires: sumTires(todayRecords) },
    week: { count: weekRecords.length, revenue: sumTotal(weekRecords), cost: sumCost(weekRecords), profit: sumTotal(weekRecords) - sumCost(weekRecords), tires: sumTires(weekRecords) },
    month: { count: monthRecords.length, revenue: sumTotal(monthRecords), cost: sumCost(monthRecords), profit: sumTotal(monthRecords) - sumCost(monthRecords), tires: sumTires(monthRecords) },
    serviceBreakdown,
    brandCounts,
    monthlyRevenue,
    recentRecords: sortedAsc.slice(-10).reverse()
  };
}

export async function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return { imported: 0, skipped: 0, errors: [] };

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const dateRaw = values[0]?.trim();
      if (!dateRaw) { skipped++; continue; }

      let date = dateRaw.trim();
      const slashParts = date.split('/');
      if (slashParts.length === 3) {
        const [d, m, y] = slashParts.map(s => s.trim());
        let year = Number(y);
        if (year < 100) year += 2000; // expand 2-digit CE year e.g. 23 → 2023
        date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Skip rows with unparseable or implausible dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < 2000) {
        errors.push(`Row ${i + 1}: วันที่ไม่ถูกต้อง "${dateRaw}"`);
        skipped++;
        continue;
      }

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

      await create({
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

export async function exportAll() {
  const all = await readAll();
  return serializeRecords(HEADERS, all);
}

export const SERVICE_HEADERS = HEADERS;
