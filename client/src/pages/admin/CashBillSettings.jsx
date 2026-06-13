import { useState, useEffect } from 'react';
import { getCashBillConfig, saveCashBillConfig, DEFAULT_CASH_BILL_CONFIG } from '../../utils/receiptStorage.js';
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
  tire_size: '205/55R16',
  price_per_unit: '2500',
  total_price: '10000',
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

export default function CashBillSettings() {
  const [config, setConfig] = useState(DEFAULT_CASH_BILL_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCashBillConfig().then(setConfig);
  }, []);

  const update = (key, value) => {
    setSaved(false);
    setConfig(c => ({ ...c, [key]: value }));
  };

  const handleSave = async () => {
    await saveCashBillConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">ตั้งค่าบิลเงินสด</h2>
        <p className="text-sm text-text-secondary mt-1">กำหนดข้อมูลสำหรับบิลเงินสด (ไม่มีข้อมูลภาษี)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-base">ข้อมูลร้าน</h3>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              ชื่อร้าน / กิจการ <span className="text-text-muted font-normal">(ไม่บังคับ)</span>
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

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-success text-white'
                : 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              {saved ? 'check_circle' : 'save'}
            </span>
            {saved ? 'บันทึกแล้ว!' : 'บันทึกการตั้งค่า'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">ตัวอย่างใบเสร็จ</h3>
            <span className="text-xs text-text-muted bg-surface px-2.5 py-1 rounded-lg border border-border-light">
              บิลเงินสด
            </span>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-border-light p-6 flex justify-center overflow-auto">
            <div className="shadow-md border border-gray-200">
              <ReceiptDocument
                config={config}
                data={SAMPLE_DATA}
                receiptNumber="TT-PREVIEW"
                type="cash_bill"
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
