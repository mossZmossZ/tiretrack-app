import { useState } from 'react';
import { getReceiptConfig, saveReceiptConfig } from '../../utils/receiptStorage.js';
import { ReceiptDocument } from '../../components/ReceiptDocument.jsx';

const SAMPLE_DATA = {
  service_type: 'tire_change',
  license_plate: 'กข 1234',
  province: 'กรุงเทพมหานคร',
  car_model: 'Honda Civic',
  car_color: 'ขาว',
  quantity: '4',
  tire_brand: 'MC',
  tire_model: 'Primacy 4',
  tire_size: '205/55-16',
  price_per_unit: '2500',
  total_price: '10000',
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

export default function ReceiptSettings() {
  const [config, setConfig] = useState(getReceiptConfig());
  const [saved, setSaved] = useState(false);

  const update = (key, value) => {
    setSaved(false);
    setConfig(c => ({ ...c, [key]: value }));
  };

  const handleSave = () => {
    saveReceiptConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isReady = config.shop_name.trim() && config.tax_id.trim().length === 13;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">ตั้งค่าใบเสร็จ</h2>
        <p className="text-sm text-text-secondary mt-1">กำหนดข้อมูลผู้ประกอบการสำหรับ ใบกำกับภาษีอย่างย่อ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-base">ข้อมูลผู้ประกอบการ</h3>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              ชื่อร้าน / กิจการ <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={config.shop_name}
              onChange={e => update('shop_name', e.target.value)}
              placeholder="เช่น ร้านยางสมชาย"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              เลขประจำตัวผู้เสียภาษี <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={config.tax_id}
                onChange={e => update('tax_id', e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="0000000000000"
                maxLength={13}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-primary transition-colors font-mono tracking-[0.2em]"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                config.tax_id.length === 13 ? 'text-success' : 'text-text-muted'
              }`}>
                {config.tax_id.length}/13
              </span>
            </div>
            {config.tax_id.length > 0 && config.tax_id.length < 13 && (
              <p className="text-xs text-danger mt-1">ต้องมี 13 หลัก</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              ที่อยู่ <span className="text-text-muted font-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={config.address}
              onChange={e => update('address', e.target.value)}
              rows={2}
              placeholder="เช่น 123/45 ถ.สุขุมวิท แขวงคลองเตย กรุงเทพ 10110"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-primary resize-none transition-colors"
            />
          </div>

          {/* VAT toggle */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => update('vat_registered', !config.vat_registered)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                config.vat_registered ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                config.vat_registered ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
            <div>
              <p className="text-sm font-medium">แสดงภาษีมูลค่าเพิ่ม 7%</p>
              <p className="text-xs text-text-muted">แยกแสดง VAT และราคาก่อนภาษีในใบเสร็จ</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!isReady}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-success text-white'
                : isReady
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]'
                  : 'bg-border text-text-muted cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              {saved ? 'check_circle' : 'save'}
            </span>
            {saved ? 'บันทึกแล้ว!' : 'บันทึกการตั้งค่า'}
          </button>

          {!isReady && (
            <p className="text-xs text-text-muted text-center -mt-3">
              กรอกชื่อร้านและเลขประจำตัวผู้เสียภาษีให้ครบก่อนบันทึก
            </p>
          )}
        </div>

        {/* Receipt Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">ตัวอย่างใบเสร็จ</h3>
            <span className="text-xs text-text-muted bg-surface px-2.5 py-1 rounded-lg border border-border-light">
              ใบกำกับภาษีอย่างย่อ
            </span>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-border-light p-6 flex justify-center overflow-auto">
            <div className="shadow-md border border-gray-200">
              <ReceiptDocument
                config={config}
                data={SAMPLE_DATA}
                receiptNumber="TT-PREVIEW"
              />
            </div>
          </div>
          <p className="text-xs text-text-muted text-center">
            ตัวอย่างที่แสดงใช้ข้อมูลจำลอง — ใบจริงจะใช้ข้อมูลบริการที่บันทึก
          </p>
        </div>
      </div>
    </div>
  );
}
