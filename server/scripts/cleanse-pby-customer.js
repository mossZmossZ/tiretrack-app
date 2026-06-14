/**
 * Cleanse inventory/PBY-Customer.csv:
 *   1. Remove blank separator rows
 *   2. Convert Buddhist Era dates to CE (subtract 543)
 *   3. Inherit missing dates from the previous dated row
 *   4. Strip price formatting (quotes, commas, whitespace) → plain number
 *   5. Strip Thai suffixes from quantity (ชุด, ลูก) → plain number
 *   6. Swap swapped color/quantity columns (row 10330 pattern)
 *   7. Split multi-tire rows (2/2 pattern) into separate rows
 *   8. Handle complex price splits (keep tire price, move extras to notes)
 *
 * Usage:
 *   node server/scripts/cleanse-pby-customer.js
 *
 * Output: inventory/PBY-Customer-cleaned.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, '../../inventory/PBY-Customer.csv');
const OUTPUT = path.join(__dirname, '../../inventory/PBY-Customer-cleaned.csv');

const THAI_COLORS = ['ดำ','ขาว','เทา','ทอง','บอรน์','บรอน','แดง','น้ำเงิน','เขียว','ฟ้า','เหลือง','เงิน','ส้ม','ม่วง','น้ำตาล','ครีม','บรอน์','บรอนซ์'];

// Regex for a single tire size like 215/65-16 or 265/70-16
const TIRE_SIZE_RE = /\d+\/\d+-\d+/;

function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function isBlankRow(fields) {
  return fields.every(f => f.trim() === '');
}

function convertBEDate(dateStr) {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return dateStr;
  const year = parseInt(m[3], 10);
  if (year > 2500) return `${m[1]}/${m[2]}/${year - 543}`;
  return dateStr;
}

function cleanPrice(raw) {
  return raw.replace(/[",\s]/g, '');
}

// Strip Thai quantity suffixes: ชุด, ลูก, /ชุด, /ลูก
function cleanQuantity(raw) {
  return raw.trim().replace(/\s*[\/]?\s*(ชุด|ลูก)\s*$/u, '').trim();
}

// Check if a value looks like a color (not a quantity)
function isColor(val) {
  return THAI_COLORS.some(c => val.includes(c));
}

function fieldsToCSV(fields) {
  return fields.join(',');
}

// Legitimate tire model names that contain Thai characters — keep these as-is
const THAI_MODEL_WHITELIST = new Set([
  'Exดูราพลัส', 'LTทัวร์', 'ครอสเทรน',
  'ดูราพลัส', 'ดูลาพลัส', 'ดูลาวิส',
  'เรเดียน', 'เรเดียน156', 'เรเดียน157',
]);

function hasThai(str) {
  return /[ก-ฮ]/.test(str);
}

// Clean the model field: move non-tire values to notes.
// Rule: any Thai-containing value not in the whitelist → notes.
function cleanModelField(model, existingNotes) {
  const m = model.trim();
  if (!m) return { model: m, notes: existingNotes };

  // Whitelisted legitimate Thai-containing tire models
  if (THAI_MODEL_WHITELIST.has(m)) return { model: m, notes: existingNotes };

  // Mixed model+year: "M3/ปี25" or "HPM3 ปี22" → keep model part, move year to notes
  const mixedSuffix = m.match(/^(.+?)[\s\/](ปี\d{2,4})$/);
  if (mixedSuffix && !hasThai(mixedSuffix[1])) {
    const newNotes = [existingNotes, mixedSuffix[2]].filter(Boolean).join(', ');
    return { model: mixedSuffix[1].trim(), notes: newNotes };
  }

  // Any remaining Thai-containing value → move to notes
  if (hasThai(m)) {
    const newNotes = [existingNotes, m].filter(Boolean).join(', ');
    return { model: '', notes: newNotes };
  }

  return { model: m, notes: existingNotes };
}

// Split a dual-brand row into 2 rows
function splitDualBrandRow(date, plate, car, color, qty, brand, model, size, price, notes, tail) {
  const [brand1, brand2] = brand.split('/').map(s => s.trim());
  const totalQty = parseInt(qty, 10);

  // Qty split: read หน้าXหลังY from model if present, else floor/ceil
  let qty1, qty2;
  const posMatch = model.match(/หน้า(\d+)หลัง(\d+)/);
  if (posMatch) {
    qty1 = parseInt(posMatch[1], 10);
    qty2 = parseInt(posMatch[2], 10);
  } else {
    qty1 = Math.floor(totalQty / 2);
    qty2 = Math.ceil(totalQty / 2);
  }

  // Model split: "579/XCD" → ['579', 'XCD'] — but not for tire-size-like values
  let model1, model2;
  if (model.includes('/') && !/^\d+\/\d+(-\d+)?$/.test(model)) {
    const parts = model.split('/');
    model1 = parts[0].trim();
    model2 = parts.slice(1).join('/').trim();
  } else {
    model1 = model2 = model;
  }

  // Size split: space-separated, full-slash, or partial-slash
  let size1, size2;
  const spaceSplit = size.match(/^(\S+)\s+(\S+)$/);
  const fullSlash  = size.match(/^(\d+\/\d+-\d+)\/(\d+\/\d+-\d+)$/);
  const partSlash  = size.match(/^(\d+\/\d+)\/(\d+\/\d+)$/) || size.match(/^(\d+-\d+)\/(\d+-\d+)$/);
  if (spaceSplit)     { [size1, size2] = [spaceSplit[1], spaceSplit[2]]; }
  else if (fullSlash) { [size1, size2] = [fullSlash[1], fullSlash[2]]; }
  else if (partSlash) { [size1, size2] = [partSlash[1], partSlash[2]]; }
  else                { size1 = size2 = size; }

  // Price split: "BF7200MS8000" pattern, then "/", else same price
  let price1, price2;
  const bpMatch = price.match(new RegExp(`^${brand1}(\\d+)${brand2}(\\d+)$`, 'i'));
  if (bpMatch) {
    [price1, price2] = [bpMatch[1], bpMatch[2]];
  } else if (price.includes('/')) {
    const parts = price.split('/');
    price1 = parts[0].trim();
    price2 = parts.slice(1).join('/').trim();
  } else {
    price1 = price2 = price;
  }

  return [
    [date, plate, car, color, String(qty1), brand1, model1, size1, price1, notes, ...tail],
    [date, plate, car, color, String(qty2), brand2, model2, size2, price2, notes, ...tail],
  ];
}

// Returns one or more output rows from a single parsed row
function expandRow(f) {
  const [date, plate, car, color, qty, brand, model, size, price, notes, ...tail] = f;

  // --- Detect swapped color/quantity (e.g. color=4, qty=เทา) ---
  let resolvedColor = color.trim();
  let resolvedQty   = qty.trim();
  if (/^\d+$/.test(resolvedColor) && isColor(resolvedQty)) {
    [resolvedColor, resolvedQty] = [resolvedQty, resolvedColor];
  }

  // --- Strip Thai qty suffixes (ชุด, ลูก, /ชุด, /ลูก) ---
  resolvedQty = cleanQuantity(resolvedQty);

  // --- Handle N/N split rows ---
  if (/^\d+\/\d+$/.test(resolvedQty)) {
    const [qty1, qty2] = resolvedQty.split('/');
    const prices = price.includes('/') ? price.split('/').map(s => s.trim()) : [price];

    // Determine if this is a genuine split (different tire types) or a rim charge
    const sizeSplitMatch = size.match(/^(\d+\/\d+-\d+)\/(\d+\/\d+-\d+)$/);
    // Model split pattern: "611/2 604/2" → models 611 and 604
    const modelSplitMatch = model.match(/^(\S+)\/\d+\s+(\S+)\/\d+$/);
    const isGenuineSplit = brand.includes('/') || sizeSplitMatch || modelSplitMatch;

    if (isGenuineSplit) {
      const brands = brand.includes('/') ? brand.split('/').map(s => s.trim()) : [brand, brand];
      const sizes  = sizeSplitMatch ? [sizeSplitMatch[1], sizeSplitMatch[2]] : [size, size];
      const models = modelSplitMatch ? [modelSplitMatch[1], modelSplitMatch[2]] : [model, model];

      // Price: use split prices if available, otherwise halve the single price
      let price1, price2;
      if (prices.length >= 2) {
        [price1, price2] = prices;
      } else {
        const half = Math.round(parseInt(prices[0], 10) / 2);
        price1 = String(half);
        price2 = String(half);
      }

      return [
        [date, plate, car, resolvedColor, qty1, brands[0], models[0], sizes[0], price1, notes, ...tail],
        [date, plate, car, resolvedColor, qty2, brands[1], models[1], sizes[1], price2, notes, ...tail],
      ];
    }

    // Rim case: same brand/size → combine qty, keep tire price, append rim charge to notes
    const totalQty = String(parseInt(qty1, 10) + parseInt(qty2, 10));
    const rimNote  = prices.length >= 2 ? `ค่ากะทะ ${prices[1]}` : '';
    const newNotes = [notes, rimNote].filter(Boolean).join(', ');
    return [[date, plate, car, resolvedColor, totalQty, brand, model, size, prices[0], newNotes, ...tail]];
  }

  // --- Dual-brand with single numeric qty → split into 2 rows ---
  if (brand.includes('/') && /^\d+$/.test(resolvedQty)) {
    return splitDualBrandRow(date, plate, car, resolvedColor, resolvedQty, brand, model, size, price, notes, tail);
  }

  // --- Complex multi-part price (3+ parts, e.g. 2900/600/300): keep first, drop rest ---
  let resolvedPrice = price;
  if (/^\d+(\/\d+){2,}$/.test(price)) {
    resolvedPrice = price.split('/')[0];
  }

  return [[date, plate, car, resolvedColor, resolvedQty, brand, model, size, resolvedPrice, notes, ...tail]];
}

const raw = fs.readFileSync(INPUT, 'utf8');
const lines = raw.split('\n');

const outputLines = [];
let lastDate = '';
let stats = { blank: 0, beDates: 0, inheritedDates: 0, pricesCleaned: 0, split: 0, modelCleaned: 0 };

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const fields = parseCSVLine(line);
  if (isBlankRow(fields)) { stats.blank++; continue; }

  const isHeader = fields[1]?.trim() === 'ทะเบียนรถ';

  if (isHeader) {
    outputLines.push(fieldsToCSV(fields));
    continue;
  }

  // --- Date ---
  const rawDate = fields[0].trim();
  if (rawDate) {
    const converted = convertBEDate(rawDate);
    if (converted !== rawDate) stats.beDates++;
    fields[0] = converted;
    lastDate = converted;
  } else if (lastDate) {
    fields[0] = lastDate;
    stats.inheritedDates++;
  }

  // --- Price clean (before expand, catches quoted comma-thousands) ---
  if (fields.length > 8 && fields[8].trim()) {
    const orig = fields[8];
    fields[8] = cleanPrice(fields[8]);
    if (fields[8] !== orig) stats.pricesCleaned++;
  }

  // --- Expand (splits, swaps, qty clean, rim notes) ---
  const expanded = expandRow(fields);
  if (expanded.length > 1) stats.split++;

  for (const row of expanded) {
    // --- Clean model field (index 6): move non-tire values to notes (index 9) ---
    if (row[6] !== undefined) {
      const { model: cleanedModel, notes: updatedNotes } = cleanModelField(row[6], row[9] || '');
      if (cleanedModel !== row[6]) stats.modelCleaned = (stats.modelCleaned || 0) + 1;
      row[6] = cleanedModel;
      row[9] = updatedNotes;
    }
    outputLines.push(fieldsToCSV(row));
  }
}

fs.writeFileSync(OUTPUT, outputLines.join('\n'), 'utf8');

console.log('Cleansing complete:');
console.log(`  Blank rows removed   : ${stats.blank}`);
console.log(`  BE dates converted   : ${stats.beDates}`);
console.log(`  Dates inherited      : ${stats.inheritedDates}`);
console.log(`  Prices cleaned       : ${stats.pricesCleaned}`);
console.log(`  Split rows           : ${stats.split}`);
console.log(`  Model fields cleaned : ${stats.modelCleaned}`);
console.log(`  Output rows          : ${outputLines.length}`);
console.log(`  Output file          : ${OUTPUT}`);
