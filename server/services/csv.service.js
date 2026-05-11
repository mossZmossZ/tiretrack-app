import { v4 as uuidv4 } from 'uuid';
import { Service } from '../models/Service.model.js';
import { Inventory } from '../models/Inventory.model.js';

const PROVINCE_SUFFIX_MAP = {
  'กรุงเทพมหานคร': 'กรุงเทพมหานคร',
  'กทม': 'กรุงเทพมหานคร',
  'กท': 'กรุงเทพมหานคร',
  'กทส': 'กรุงเทพมหานคร',
  'เพชรบูรณ์': 'เพชรบูรณ์',
  'พช': 'เพชรบูรณ์',
  'นครสวรรค์': 'นครสวรรค์',
  'นครสวรรค': 'นครสวรรค์',
  'นครสวร': 'นครสวรรค์',
  'นครราชสีมา': 'นครราชสีมา',
  'นครราช': 'นครราชสีมา',
  'นครราชสี': 'นครราชสีมา',
  'นครราชส': 'นครราชสีมา',
  'นม': 'นครราชสีมา',
  'พิษณุโลก': 'พิษณุโลก',
  'พิษณูโลก': 'พิษณุโลก',
  'พล': 'พิษณุโลก',
  'ชัยภูมิ': 'ชัยภูมิ',
  'ชภ': 'ชัยภูมิ',
  'ชัภูมิ': 'ชัยภูมิ',
  'ชย': 'ชัยภูมิ',
  'เชียงใหม่': 'เชียงใหม่',
  'ชม': 'เชียงใหม่',
  'เชียงราย': 'เชียงราย',
  'ชร': 'เชียงราย',
  'ขอนแก่น': 'ขอนแก่น',
  'ขอน': 'ขอนแก่น',
  'ขอนแ่น': 'ขอนแก่น',
  'ขก': 'ขอนแก่น',
  'ชลบุรี': 'ชลบุรี',
  'ชล': 'ชลบุรี',
  'ลำพูน': 'ลำพูน',
  'ลำพู': 'ลำพูน',
  'มหาสารคาม': 'มหาสารคาม',
  'มหาสาราคาม': 'มหาสารคาม',
  'สารคาม': 'มหาสารคาม',
  'สุโขทัย': 'สุโขทัย',
  'อุตรดิตถ์': 'อุตรดิตถ์',
  'อุตรดิต': 'อุตรดิตถ์',
  'พิจิตร': 'พิจิตร',
  'นครปฐม': 'นครปฐม',
  'นฐ': 'นครปฐม',
  'นครพนม': 'นครพนม',
  'นพ': 'นครพนม',
  'กาญจนบุรี': 'กาญจนบุรี',
  'กาญบุรี': 'กาญจนบุรี',
  'กาญ': 'กาญจนบุรี',
  'กำแพงเพชร': 'กำแพงเพชร',
  'กำแพง': 'กำแพงเพชร',
  'ตาก': 'ตาก',
  'เลย': 'เลย',
  'อุดรธานี': 'อุดรธานี',
  'อุดร': 'อุดรธานี',
  'อุด': 'อุดรธานี',
  'น่าน': 'น่าน',
  'แพร่': 'แพร่',
  'พะเยา': 'พะเยา',
  'แม่ฮ่องสอน': 'แม่ฮ่องสอน',
  'ลำปาง': 'ลำปาง',
  'ลป': 'ลำปาง',
  'อุบลราชธานี': 'อุบลราชธานี',
  'อุบล': 'อุบลราชธานี',
  'อบ': 'อุบลราชธานี',
  'ศรีสะเกษ': 'ศรีสะเกษ',
  'ศก': 'ศรีสะเกษ',
  'สุรินทร์': 'สุรินทร์',
  'สร': 'สุรินทร์',
  'บุรีรัมย์': 'บุรีรัมย์',
  'บร': 'บุรีรัมย์',
  'ร้อยเอ็ด': 'ร้อยเอ็ด',
  'รอ': 'ร้อยเอ็ด',
  'กาฬสินธุ์': 'กาฬสินธุ์',
  'กาฬสิน': 'กาฬสินธุ์',
  'กาสิน': 'กาฬสินธุ์',
  'กสิน': 'กาฬสินธุ์',
  'กส': 'กาฬสินธุ์',
  'ยโสธร': 'ยโสธร',
  'นครนายก': 'นครนายก',
  'นย': 'นครนายก',
  'ปราจีนบุรี': 'ปราจีนบุรี',
  'ปจ': 'ปราจีนบุรี',
  'สระแก้ว': 'สระแก้ว',
  'สก': 'สระแก้ว',
  'ฉะเชิงเทรา': 'ฉะเชิงเทรา',
  'ฉะเชิง': 'ฉะเชิงเทรา',
  'ฉช': 'ฉะเชิงเทรา',
  'จันทบุรี': 'จันทบุรี',
  'จัน': 'จันทบุรี',
  'จบ': 'จันทบุรี',
  'ระยอง': 'ระยอง',
  'รย': 'ระยอง',
  'ตราด': 'ตราด',
  'ตร': 'ตราด',
  'ปทุมธานี': 'ปทุมธานี',
  'ปทุม': 'ปทุมธานี',
  'ปท': 'ปทุมธานี',
  'สมุทรปราการ': 'สมุทรปราการ',
  'สป': 'สมุทรปราการ',
  'สมุทรสาคร': 'สมุทรสาคร',
  'สค': 'สมุทรสาคร',
  'สมุทรสงคราม': 'สมุทรสงคราม',
  'สส': 'สมุทรสงคราม',
  'นนทบุรี': 'นนทบุรี',
  'นบ': 'นนทบุรี',
  'พระนครศรีอยุธยา': 'พระนครศรีอยุธยา',
  'อยุธยา': 'พระนครศรีอยุธยา',
  'อย': 'พระนครศรีอยุธยา',
  'อ่างทอง': 'อ่างทอง',
  'สิงห์บุรี': 'สิงห์บุรี',
  'ลพบุรี': 'ลพบุรี',
  'ลบ': 'ลพบุรี',
  'สระบุรี': 'สระบุรี',
  'สห': 'สระบุรี',
  'ราชบุรี': 'ราชบุรี',
  'รบ': 'ราชบุรี',
  'สุพรรณบุรี': 'สุพรรณบุรี',
  'สพ': 'สุพรรณบุรี',
  'ประจวบคีรีขันธ์': 'ประจวบคีรีขันธ์',
  'ประจวบ': 'ประจวบคีรีขันธ์',
  'ปข': 'ประจวบคีรีขันธ์',
  'เพชรบุรี': 'เพชรบุรี',
  'พบ': 'เพชรบุรี',
  'ชุมพร': 'ชุมพร',
  'ระนอง': 'ระนอง',
  'สุราษฎร์ธานี': 'สุราษฎร์ธานี',
  'สุราษฎร์': 'สุราษฎร์ธานี',
  'นครศรีธรรมราช': 'นครศรีธรรมราช',
  'นครศรี': 'นครศรีธรรมราช',
  'นศ': 'นครศรีธรรมราช',
  'พัทลุง': 'พัทลุง',
  'สงขลา': 'สงขลา',
  'สข': 'สงขลา',
  'กระบี่': 'กระบี่',
  'กบ': 'กระบี่',
  'ตรัง': 'ตรัง',
  'พังงา': 'พังงา',
  'ภูเก็ต': 'ภูเก็ต',
  'สตูล': 'สตูล',
  'ยะลา': 'ยะลา',
  'ปัตตานี': 'ปัตตานี',
  'นราธิวาส': 'นราธิวาส',
  'นธ': 'นราธิวาส',
  'หนองคาย': 'หนองคาย',
  'นค': 'หนองคาย',
  'บึงกาฬ': 'บึงกาฬ',
  'สกลนคร': 'สกลนคร',
  'นครพนม': 'นครพนม',
  'มุกดาหาร': 'มุกดาหาร',
  'อำนาจเจริญ': 'อำนาจเจริญ',
  'อจ': 'อำนาจเจริญ',
};

const PROVINCE_SUFFIXES = Object.keys(PROVINCE_SUFFIX_MAP)
  .sort((a, b) => b.length - a.length);

function extractProvince(plateStr) {
  if (!plateStr) return { plate: '', province: '' };
  const trimmed = plateStr.trim();
  for (const suffix of PROVINCE_SUFFIXES) {
    if (trimmed.endsWith(suffix)) {
      return {
        plate: trimmed.slice(0, -suffix.length),
        province: PROVINCE_SUFFIX_MAP[suffix]
      };
    }
  }
  return { plate: trimmed, province: '' };
}

function cleanNone(val) {
  if (!val) return '';
  const cleaned = val.trim();
  if (cleaned === 'none' || cleaned === 'None' || cleaned === 'NONE') return '';
  return cleaned;
}

const HEADERS = [
  'id', 'date', 'license_plate', 'province', 'car_model', 'car_color',
  'service_type', 'quantity', 'tire_brand', 'tire_model', 'tire_size',
  'price_per_unit', 'total_price', 'technician', 'notes', 'cost_price', 'created_at', 'created_by'
];

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
  const docs = await Service.find({}).lean();
  return docs.map(toRecord);
}

export async function findById(id) {
  const doc = await Service.findById(id).lean();
  return doc ? toRecord(doc) : null;
}

export async function search(query) {
  if (!query) return readAll();
  const q = query.trim();
  const docs = await Service.find({ license_plate: { $regex: q, $options: 'i' } }).lean();
  return docs.map(toRecord);
}

export async function create(data, createdBy = 'tech') {
  const id = uuidv4().slice(0, 8);
  const record = {
    _id: id,
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

  if (record.service_type === 'tire_change' && record.quantity && record.price_per_unit && !data.total_price) {
    record.total_price = String(Number(record.quantity) * Number(record.price_per_unit));
  }

  await Service.create(record);
  return toRecord(record);
}

export async function deleteById(id) {
  const result = await Service.findByIdAndDelete(id);
  return result !== null;
}

export async function updateById(id, updates) {
  const doc = await Service.findById(id).lean();
  if (!doc) return null;

  const merged = { ...doc, ...updates };
  delete merged._id;
  delete merged.__v;

  if (merged.service_type === 'tire_change' && merged.quantity && merged.price_per_unit) {
    merged.total_price = String(Number(merged.quantity) * Number(merged.price_per_unit));
  }

  await Service.findByIdAndUpdate(id, merged);
  return toRecord({ _id: id, ...merged });
}

export async function getStats() {
  const all = await readAll();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
  all.forEach(r => {
    const month = r.date?.slice(0, 7);
    if (month) {
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(r.total_price || 0);
    }
  });

  const sumTotal = (records) => records.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const sumCost = (records) => records.reduce((s, r) => s + (Number(r.cost_price || 0) * Number(r.quantity || 1)), 0);
  const sumTires = (records) => records
    .filter(r => r.service_type === 'tire_change')
    .reduce((s, r) => s + Number(r.quantity || 0), 0);

  const recentRecords = [...all]
    .sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date))
    .slice(0, 10);

  return {
    total: all.length,
    today: { count: todayRecords.length, revenue: sumTotal(todayRecords), cost: sumCost(todayRecords), profit: sumTotal(todayRecords) - sumCost(todayRecords), tires: sumTires(todayRecords) },
    week: { count: weekRecords.length, revenue: sumTotal(weekRecords), cost: sumCost(weekRecords), profit: sumTotal(weekRecords) - sumCost(weekRecords), tires: sumTires(weekRecords) },
    month: { count: monthRecords.length, revenue: sumTotal(monthRecords), cost: sumCost(monthRecords), profit: sumTotal(monthRecords) - sumCost(monthRecords), tires: sumTires(monthRecords) },
    serviceBreakdown,
    brandCounts,
    monthlyRevenue,
    recentRecords
  };
}

// Import legacy CSV format (old column order)
export async function importLegacy(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return { imported: 0, skipped: 0, errors: [] };

  // Pre-load all inventory into a lookup map: brand|size|model => cost_price
  const inventoryMap = new Map();
  try {
    const inventoryDocs = await Inventory.find({}).lean();
    for (const item of inventoryDocs) {
      const key = `${item.tire_brand || ''}|${item.tire_size || ''}|${item.tire_model || ''}`.toLowerCase();
      if (item.tire_brand && item.tire_size && item.cost_price) {
        inventoryMap.set(key, item.cost_price);
      }
    }
  } catch (e) {
    // Inventory lookup is best-effort; continue without it
    console.warn('[importLegacy] Could not load inventory for cost_price lookup:', e.message);
  }

  let imported = 0;
  let skipped = 0;
  let matched = 0;
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const dateRaw = values[0]?.trim();
      if (!dateRaw) { skipped++; continue; }

      let date = dateRaw;
      const dateParts = dateRaw.split('/');
      if (dateParts.length === 3) {
        const [d, m, y] = dateParts;
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      const plateRaw = values[1]?.trim() || '';
      const { plate, province } = extractProvince(plateRaw);

      const priceStr = (values[8] || '').replace(/[,฿\s]/g, '').trim();
      const price = Number(priceStr) || 0;
      const qty = Number(values[4]?.trim()) || 0;

      const tireBrand = cleanNone(values[5]?.trim() || '');
      const tireModel = cleanNone(values[6]?.trim() || '');
      const tireSize = cleanNone(values[7]?.trim() || '');

      // Look up cost_price from inventory
      let costPrice = '0';
      if (tireBrand && tireSize) {
        const lookupKey = `${tireBrand}|${tireSize}|${tireModel}`.toLowerCase();
        const found = inventoryMap.get(lookupKey);
        if (found) {
          costPrice = found;
          matched++;
        }
      }

      await create({
        date,
        license_plate: cleanNone(plate || plateRaw),
        province,
        car_model: cleanNone(values[2]?.trim() || ''),
        car_color: cleanNone(values[3]?.trim() || ''),
        service_type: 'tire_change',
        quantity: String(qty),
        tire_brand: tireBrand,
        tire_model: tireModel,
        tire_size: tireSize,
        price_per_unit: String(price),
        total_price: String(qty * price),
        cost_price: costPrice,
        notes: cleanNone(values[9]?.trim() || '')
      }, 'admin');

      imported++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
      skipped++;
    }
  }

  return { imported, skipped, matched, errors };
}

// Export all records as CSV string
export async function exportAll() {
  const all = await readAll();
  const lines = [HEADER_LINE];
  all.forEach(record => {
    lines.push(HEADERS.map(h => escapeCSV(record[h])).join(','));
  });
  return lines.join('\n') + '\n';
}

// Used by backup restore: clear collection and reimport from current-format CSV
export async function importCurrentCSV(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  await Service.deleteMany({});
  if (lines.length <= 1) return;

  const docs = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    HEADERS.forEach((h, idx) => { record[h] = values[idx] || ''; });
    if (!record.id) continue;
    docs.push({
      _id: record.id,
      date: record.date,
      license_plate: record.license_plate,
      province: record.province,
      car_model: record.car_model,
      car_color: record.car_color,
      service_type: record.service_type,
      quantity: record.quantity,
      tire_brand: record.tire_brand,
      tire_model: record.tire_model,
      tire_size: record.tire_size,
      price_per_unit: record.price_per_unit,
      total_price: record.total_price,
      technician: record.technician,
      notes: record.notes,
      cost_price: record.cost_price,
      created_at: record.created_at,
      created_by: record.created_by
    });
  }

  if (docs.length > 0) {
    await Service.insertMany(docs, { ordered: false });
  }
}
