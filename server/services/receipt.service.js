import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const TIRE_BRANDS = {
  MC: 'Michelin', BS: 'Bridgestone', GY: 'Goodyear', ML: 'Maxxis',
  DL: 'Dunlop', YK: 'Yokohama', TY: 'Toyo', MS: 'Maxxis Sport',
  HK: 'Hankook', KD: 'Kumho', OT: 'อื่นๆ',
};

const SERVICE_LABELS = {
  tire_change: 'เปลี่ยนยาง',
  wheel_balance: 'ถ่วงล้อ',
  wheel_alignment: 'ตั้งศูนย์ล้อ',
  tire_switch: 'สลับยาง',
  tire_pressure: 'เช็คลมยาง',
};

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `฿${num.toLocaleString('th-TH')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function generateReceiptNumber(record) {
  const datePart = (record.date || '').replace(/-/g, '');
  return `TT-${datePart}-${record.id.toUpperCase()}`;
}

export function generateReceiptHTML(record, config, receiptNumber) {
  const total = Number(record.total_price || 0);
  const vatAmount = config.vat_registered ? Math.round(total * 7 / 107) : 0;
  const subtotal = total - vatAmount;

  const brandLabel = TIRE_BRANDS[record.tire_brand] || record.tire_brand || '';
  const serviceLabel = SERVICE_LABELS[record.service_type] || record.service_type || '';
  const isTireChange = record.service_type === 'tire_change';

  const itemRow = isTireChange ? `
    <div style="font-weight:600;">${serviceLabel}</div>
    <div style="font-size:10px;color:#333;">${[brandLabel, record.tire_model, record.tire_size].filter(Boolean).join(' / ')}</div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:10px;">${formatCurrency(record.price_per_unit)} × ${record.quantity} เส้น</span>
      <span style="font-weight:600;">${formatCurrency(subtotal)}</span>
    </div>
  ` : `
    <div style="font-weight:600;">${serviceLabel}</div>
    <div style="display:flex;justify-content:space-between;">
      <span></span>
      <span style="font-weight:600;">${formatCurrency(subtotal)}</span>
    </div>
  `;

  const vatRows = config.vat_registered ? `
    <div style="display:flex;justify-content:space-between;font-size:10px;">
      <span>ราคาก่อนภาษี</span><span>${formatCurrency(subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;">
      <span>ภาษีมูลค่าเพิ่ม 7%</span><span>${formatCurrency(vatAmount)}</span>
    </div>
    <hr style="border:none;border-top:1px solid #000;margin:4px 0;">
  ` : '';

  const vatNote = config.vat_registered
    ? '<div style="text-align:right;font-size:10px;color:#555;">(รวมภาษีมูลค่าเพิ่มแล้ว)</div>'
    : '';

  const carInfo = record.license_plate ? `
    <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
    <div style="font-size:10px;">
      <div><b>ทะเบียน:</b> ${record.license_plate}${record.province ? ` (${record.province})` : ''}</div>
      ${record.car_model ? `<div><b>รุ่น:</b> ${record.car_model}${record.car_color ? ` / ${record.car_color}` : ''}</div>` : ''}
    </div>
  ` : '';

  const notesRow = record.notes
    ? `<div style="font-size:10px;color:#555;margin-top:2px;">หมายเหตุ: ${record.notes}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จ ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap');
    body { margin: 0; padding: 8mm; background: #fff; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="width:72mm;font-family:'Sarabun','Courier New',monospace;font-size:11px;line-height:1.6;color:#000;background:#fff;padding:4mm;box-sizing:border-box;">
    <div style="text-align:center;margin-bottom:2px;">
      <div style="font-size:15px;font-weight:900;letter-spacing:0.5px;font-family:sans-serif;">${config.shop_name || 'ชื่อร้าน'}</div>
      ${config.address ? `<div style="font-size:10px;margin-top:1px;line-height:1.4;">${config.address}</div>` : ''}
      ${config.tax_id
        ? `<div style="font-size:10px;">เลขประจำตัวผู้เสียภาษี: <b>${config.tax_id}</b></div>`
        : '<div style="font-size:10px;color:#888;">(ยังไม่ได้กำหนดเลขผู้เสียภาษี)</div>'}
    </div>

    <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">

    <div style="text-align:center;">
      <div style="font-weight:bold;font-size:13px;letter-spacing:0.5px;">ใบกำกับภาษีอย่างย่อ</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;">
      <span>เลขที่: ${receiptNumber}</span>
      <span>วันที่: ${formatDate(record.date)}</span>
    </div>

    <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">

    <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:4px;">
      <span>รายการ</span><span>ราคา</span>
    </div>

    <div style="margin-bottom:4px;">
      ${itemRow}
      ${notesRow}
    </div>

    <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">

    ${vatRows}
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;">
      <span>รวมทั้งสิ้น</span><span>${formatCurrency(total)}</span>
    </div>
    ${vatNote}

    ${carInfo}

    <hr style="border:none;border-top:1px dashed #555;margin:6px 0;">
    <div style="text-align:center;font-size:11px;font-weight:600;">ขอบคุณที่ใช้บริการ</div>
    <div style="text-align:center;font-size:9px;color:#666;margin-top:2px;">${config.shop_name || 'ชื่อร้าน'}</div>
  </div>
</body>
</html>`;
}

let s3Client = null;

function getS3Client() {
  if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
    return null;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

// Upload receipt HTML to S3 at tiretrack/receipt/{receiptNumber}.html
// Returns silently if S3 is not configured.
export async function saveReceiptToS3(record, config, receiptNumber) {
  const client = getS3Client();
  if (!client) return;

  const html = generateReceiptHTML(record, config, receiptNumber);
  const key = `receipt/${receiptNumber}.html`;

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: Buffer.from(html, 'utf-8'),
    ContentType: 'text/html; charset=utf-8',
  }));
}
