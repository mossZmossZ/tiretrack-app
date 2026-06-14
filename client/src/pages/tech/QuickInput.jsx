import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { SERVICE_TYPES, CAR_COLORS, PROVINCES, QUANTITY_OPTIONS } from '../../utils/constants.js';
import { formatCurrency, formatTireSize, getToday } from '../../utils/formatters.js';
import { api } from '../../services/api.js';
import { ReceiptDocument } from '../../components/ReceiptDocument.jsx';
import { getReceiptConfig, getCashBillConfig, DEFAULT_CONFIG, DEFAULT_CASH_BILL_CONFIG } from '../../utils/receiptStorage.js';

const provinceOptions = PROVINCES.map(p => ({ value: p, label: p }));
const colorOptions = CAR_COLORS.map(c => ({ value: c, label: c }));

export default function QuickInput() {
  const [form, setForm] = useState({
    service_type: '',
    license_plate: '',
    province: '',
    car_model: '',
    car_color: '',
    quantity: '4',
    tire_brand: '',
    tire_model: '',
    tire_width: '',
    tire_aspect: '',
    tire_rim: '',
    price_per_unit: '',
    total_price: '',
    technician: '',
    notes: '',
    cost_price: '',
    date: getToday(),
  });
  const [step, setStep] = useState(1); // 1=service type, 2=plate, 3=details, 4=confirm
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCashBill, setShowCashBill] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [partsInventory, setPartsInventory] = useState([]);
  const [parts, setParts] = useState([]); // line items for part_change
  const plateRef = useRef(null);

  const isTireChange = form.service_type === 'tire_change';
  const isPartChange = form.service_type === 'part_change';

  // Load tire inventory
  useEffect(() => {
    api.get('/inventory').then(res => { if (res.success) setInventory(res.data); }).catch(() => {});
    api.get('/parts-inventory').then(res => { if (res.success) setPartsInventory(res.data); }).catch(() => {});
  }, []);

  // Auto-calculate total
  useEffect(() => {
    if (isTireChange && form.quantity && form.price_per_unit) {
      const total = Number(form.quantity) * Number(form.price_per_unit);
      setForm(f => ({ ...f, total_price: String(total) }));
    }
  }, [form.quantity, form.price_per_unit, isTireChange]);

  // Plate autocomplete
  useEffect(() => {
    if (form.license_plate.length >= 2) {
      api.get(`/services/search?q=${encodeURIComponent(form.license_plate)}`)
        .then(res => {
          if (res.success && res.data) {
            const seen = new Set();
            const unique = res.data.filter(r => {
              if (seen.has(r.license_plate)) return false;
              seen.add(r.license_plate);
              return true;
            }).slice(0, 5);
            setSuggestions(unique);
          }
        })
        .catch(() => {});
    } else {
      setSuggestions([]);
    }
  }, [form.license_plate]);

  const updateForm = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const selectServiceType = (type) => {
    updateForm('service_type', type);
    setStep(2);
    setTimeout(() => plateRef.current?.focus(), 100);
  };

  const selectSuggestion = (record) => {
    setForm(f => ({
      ...f,
      license_plate: record.license_plate,
      province: record.province || f.province,
      car_model: record.car_model || f.car_model,
      car_color: record.car_color || f.car_color,
    }));
    setSuggestions([]);
    setStep(3);
  };

  const goToDetails = () => {
    setSuggestions([]);
    setStep(3);
  };

  const goToConfirm = () => {
    if (isTireChange && (!form.tire_brand || !form.tire_width || !form.tire_rim || !form.price_per_unit)) return;
    if (isPartChange) {
      const total = parts.reduce((s, p) => s + Number(p.price_per_unit || 0) * Number(p.qty || 1), 0);
      updateForm('total_price', String(total));
      setStep(4);
      return;
    }
    if (!isTireChange && !form.total_price) {
      updateForm('total_price', '0');
    }
    setStep(4);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const tireSize = formatTireSize(form.tire_width, form.tire_aspect, form.tire_rim);
      const basePayload = { ...form, tire_size: tireSize };
      const payload = isPartChange ? { ...basePayload, parts } : basePayload;
      const res = await api.post('/services', payload);
      if (res.success) {
        setToast({ id: res.data.id, message: 'บันทึกสำเร็จ!' });
        setForm({
          service_type: '', license_plate: '', province: '', car_model: '', car_color: '',
          quantity: '4', tire_brand: '', tire_model: '', tire_width: '', tire_aspect: '', tire_rim: '',
          cost_price: '', price_per_unit: '', total_price: '', technician: '', notes: '', date: getToday(),
        });
        setParts([]);
        setStep(1);
        setTimeout(() => setToast(null), 6000);
      }
    } catch (err) {
      setToast({ message: 'เกิดข้อผิดพลาด กรุณาลองใหม่', error: true });
      setTimeout(() => setToast(null), 4000);
    }
    setSubmitting(false);
  };

  const handleUndo = async () => {
    if (!toast?.id) return;
    try {
      await api.delete(`/services/${toast.id}`);
      setToast({ message: 'ยกเลิกสำเร็จ', undone: true });
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast({ message: 'ยกเลิกไม่สำเร็จ', error: true });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const inventoryOptions = inventory.map(item => {
    const sizeLabel = formatTireSize(item.tire_width, item.tire_aspect, item.tire_rim);
    const desc = [item.tire_brand, sizeLabel, item.tire_model].filter(Boolean).join(' | ');
    return {
      value: item.id,
      label: `${desc} (ต้นทุน: ${formatCurrency(item.cost_price)})`,
      item: item
    };
  });

  const handleInventorySelect = (opt) => {
    if (!opt) {
      setForm(f => ({ ...f, tire_brand: '', tire_width: '', tire_aspect: '', tire_rim: '', tire_model: '', cost_price: '' }));
      return;
    }
    const { item } = opt;
    setForm(f => ({
      ...f,
      tire_brand: item.tire_brand,
      tire_width: item.tire_width,
      tire_aspect: item.tire_aspect,
      tire_rim: item.tire_rim,
      tire_model: item.tire_model,
      cost_price: item.cost_price
    }));
  };

  const currentServiceType = SERVICE_TYPES.find(s => s.value === form.service_type);

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border-light px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="p-1 -ml-1 text-text-secondary">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Manrope' }}>บันทึกบริการ</h1>
              <p className="text-xs text-text-muted">
                {step === 1 && 'เลือกประเภทบริการ'}
                {step === 2 && 'ใส่ทะเบียนรถ'}
                {step === 3 && (isTireChange ? 'รายละเอียดยาง' : isPartChange ? 'เลือกอะไหล่' : 'รายละเอียดบริการ')}
                {step === 4 && 'ยืนยันข้อมูล'}
              </p>
            </div>
          </div>
          {step > 1 && (
            <button
              onClick={() => {
                setForm({
                  service_type: '', license_plate: '', province: '', car_model: '', car_color: '',
                  quantity: '4', tire_brand: '', tire_model: '', tire_width: '', tire_aspect: '', tire_rim: '',
                  price_per_unit: '', total_price: '', technician: '', notes: '', date: getToday(),
                });
                setParts([]);
                setStep(1);
              }}
              className="text-xs font-bold text-text-secondary hover:text-danger bg-surface hover:bg-danger-bg px-3 py-1.5 rounded-lg border border-border border-b-2 active:border-b transition-all"
            >
              กลับหน้าแรก
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Step 1: Service Type */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {SERVICE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => selectServiceType(type.value)}
                className="service-tile bg-white rounded-2xl p-5 border-2 border-border-light text-left"
              >
                <span
                  className="material-symbols-outlined text-3xl mb-3 block"
                  style={{ color: type.color, fontVariationSettings: "'FILL' 1" }}
                >
                  {type.icon}
                </span>
                <span className="text-sm font-semibold text-text-primary block">{type.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: License Plate */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-5 border border-border-light">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">ทะเบียนรถ *</label>
              <input
                ref={plateRef}
                type="text"
                value={form.license_plate}
                onChange={e => updateForm('license_plate', e.target.value)}
                placeholder="เช่น กค1234"
                className="w-full text-2xl font-bold text-center py-3 border-b-2 border-border focus:border-primary outline-none transition-colors bg-transparent"
                style={{ fontFamily: 'Manrope' }}
              />
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-text-muted">พบในระบบ:</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-surface-dim hover:bg-primary-50 transition-colors text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{s.license_plate}</span>
                      <span className="text-text-muted text-xs">{s.car_model} {s.province}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional: Car Info */}
            <div className="bg-white rounded-2xl p-5 border border-border-light space-y-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">ข้อมูลรถ (ไม่บังคับ)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">จังหวัด</label>
                  <Select
                    options={provinceOptions}
                    value={provinceOptions.find(o => o.value === form.province) || null}
                    onChange={opt => updateForm('province', opt ? opt.value : '')}
                    placeholder="เลือก..."
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        borderColor: '#E2E8F0',
                        boxShadow: 'none',
                        fontSize: '0.875rem',
                        '&:hover': { borderColor: '#F97316' }
                      }),
                      menu: (base) => ({ ...base, fontSize: '0.875rem' })
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">สี</label>
                  <Select
                    options={colorOptions}
                    value={colorOptions.find(o => o.value === form.car_color) || null}
                    onChange={opt => updateForm('car_color', opt ? opt.value : '')}
                    placeholder="เลือก..."
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        borderColor: '#E2E8F0',
                        boxShadow: 'none',
                        fontSize: '0.875rem',
                        '&:hover': { borderColor: '#F97316' }
                      }),
                      menu: (base) => ({ ...base, fontSize: '0.875rem' })
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">รุ่นรถ</label>
                <input
                  type="text"
                  value={form.car_model}
                  onChange={e => updateForm('car_model', e.target.value)}
                  placeholder="เช่น Honda Civic, Vios"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              onClick={goToDetails}
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 transition-all active:scale-[0.98] text-sm"
            >
              ถัดไป
            </button>
          </div>
        )}

        {/* Step 3: Service Details */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            {/* Service badge */}
            <div className="flex items-center gap-2 bg-white rounded-2xl p-4 border border-border-light">
              <span className="material-symbols-outlined" style={{ color: currentServiceType?.color, fontVariationSettings: "'FILL' 1" }}>
                {currentServiceType?.icon}
              </span>
              <span className="font-semibold text-sm">{currentServiceType?.label}</span>
              <span className="text-text-muted text-sm ml-auto">{form.license_plate || '-'}</span>
            </div>

            {/* Tire-specific fields */}
            {isTireChange && (
              <div className="bg-white rounded-2xl p-5 border border-border-light space-y-4">
                {/* Quantity */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">จำนวน (เส้น)</label>
                  <div className="flex gap-2 flex-wrap">
                    {QUANTITY_OPTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => updateForm('quantity', String(q))}
                        className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                          form.quantity === String(q)
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-surface-dim text-text-secondary hover:bg-border-light'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inventory Tire Select */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">เลือกยางจากคลัง *</label>
                  <Select
                    options={inventoryOptions}
                    onChange={handleInventorySelect}
                    placeholder="พิมพ์ค้นหายี่ห้อ ขนาด หรือรุ่นยาง..."
                    isClearable
                    noOptionsMessage={() => "ไม่พบข้อมูลยาง"}
                    value={
                      form.tire_brand && form.tire_width
                        ? inventoryOptions.find(o =>
                            o.item.tire_brand === form.tire_brand &&
                            o.item.tire_width === form.tire_width &&
                            o.item.tire_aspect === form.tire_aspect &&
                            o.item.tire_rim === form.tire_rim &&
                            o.item.tire_model === form.tire_model
                          ) || null
                        : null
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        borderColor: '#E2E8F0',
                        boxShadow: 'none',
                        padding: '4px',
                        fontSize: '0.875rem',
                        '&:hover': { borderColor: '#F97316' }
                      }),
                      menu: (base) => ({ ...base, fontSize: '0.875rem' }),
                      option: (base) => ({
                        ...base,
                        padding: '10px 12px',
                      })
                    }}
                  />
                  {form.tire_brand && (
                    <div className="mt-3 bg-surface-dim p-3 rounded-xl border border-border-light flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-secondary">
                      <span><b className="text-text-primary">ยี่ห้อ:</b> {form.tire_brand}</span>
                      <span><b className="text-text-primary">ขนาด:</b> {formatTireSize(form.tire_width, form.tire_aspect, form.tire_rim)}</span>
                      <span><b className="text-text-primary">รุ่น:</b> {form.tire_model || '-'}</span>
                    </div>
                  )}
                </div>

                {/* Price per unit */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">ราคา/เส้น (บาท) *</label>
                  <input
                    type="number"
                    value={form.price_per_unit}
                    onChange={e => updateForm('price_per_unit', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary text-right text-lg font-semibold"
                  />
                </div>

                {/* Calculated total */}
                {form.quantity && form.price_per_unit && (
                  <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-text-secondary">รวมทั้งหมด</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(form.total_price)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Part change: line-items */}
            {isPartChange && (
              <PartLineItems
                parts={parts}
                setParts={setParts}
                partsInventory={partsInventory}
              />
            )}

            {/* Non-tire, non-part service: just total price */}
            {!isTireChange && !isPartChange && (
              <div className="bg-white rounded-2xl p-5 border border-border-light space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">ราคารวม (บาท)</label>
                  <input
                    type="number"
                    value={form.total_price}
                    onChange={e => updateForm('total_price', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary text-right text-lg font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 border border-border-light">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">หมายเหตุ</label>
              <textarea
                value={form.notes}
                onChange={e => updateForm('notes', e.target.value)}
                rows={2}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              onClick={goToConfirm}
              disabled={
                (isTireChange && (!form.tire_brand || !form.tire_width || !form.tire_rim || !form.price_per_unit)) ||
                (isPartChange && parts.length === 0)
              }
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none transition-all active:scale-[0.98] text-sm"
            >
              ดูสรุป
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
              {/* Summary header */}
              <div className="p-5 border-b border-border-light" style={{ background: `linear-gradient(135deg, ${currentServiceType?.color}10, transparent)` }}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl" style={{ color: currentServiceType?.color, fontVariationSettings: "'FILL' 1" }}>
                    {currentServiceType?.icon}
                  </span>
                  <div>
                    <p className="font-semibold">{currentServiceType?.label}</p>
                    <p className="text-xs text-text-muted">{form.date}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">ทะเบียนรถ</span>
                  <span className="font-semibold">{form.license_plate || '-'}</span>
                </div>
                {form.province && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">จังหวัด</span>
                    <span>{form.province}</span>
                  </div>
                )}
                {form.car_model && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">รุ่นรถ</span>
                    <span>{form.car_model}</span>
                  </div>
                )}
                {form.car_color && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">สี</span>
                    <span>{form.car_color}</span>
                  </div>
                )}
                {isTireChange && (
                  <>
                    <hr className="border-border-light" />
                    <div className="flex justify-between">
                      <span className="text-text-secondary">จำนวน</span>
                      <span>{form.quantity} เส้น</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">ยี่ห้อ / รุ่น</span>
                      <span>{form.tire_brand} {form.tire_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">ขนาด</span>
                      <span>{formatTireSize(form.tire_width, form.tire_aspect, form.tire_rim)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">ราคา/เส้น</span>
                      <span>{formatCurrency(form.price_per_unit)}</span>
                    </div>
                  </>
                )}
                {isPartChange && parts.length > 0 && (
                  <>
                    <hr className="border-border-light" />
                    {parts.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-text-secondary">{p.name} × {p.qty}</span>
                        <span>{formatCurrency(Number(p.price_per_unit) * Number(p.qty))}</span>
                      </div>
                    ))}
                  </>
                )}
                {form.notes && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">หมายเหตุ</span>
                    <span className="text-right max-w-[60%]">{form.notes}</span>
                  </div>
                )}
                <hr className="border-border-light" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">รวมทั้งหมด</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(form.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Print Receipt */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowReceipt(true)}
                className="flex-1 py-3 rounded-2xl font-semibold text-primary bg-white border-2 border-primary/25 hover:border-primary/60 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                พิมพ์ใบกำกับภาษี
              </button>
              <button
                onClick={() => setShowCashBill(true)}
                className="flex-1 py-3 rounded-2xl font-semibold text-primary bg-white border-2 border-primary/25 hover:border-primary/60 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">receipt</span>
                พิมพ์บิลเงินสด
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-3 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 disabled:opacity-50 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ยืนยันบันทึก
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal form={form} onClose={() => setShowReceipt(false)} />
      )}
      {showCashBill && (
        <CashBillModal form={form} onClose={() => setShowCashBill(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 animate-toast z-50 ${
          toast.error ? 'bg-danger' : toast.undone ? 'bg-text-secondary' : 'bg-success'
        } text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 min-w-[280px]`}>
          <span className="material-symbols-outlined text-lg">
            {toast.error ? 'error' : toast.undone ? 'undo' : 'check_circle'}
          </span>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          {toast.id && !toast.undone && (
            <button
              onClick={handleUndo}
              className="text-sm font-bold underline underline-offset-2 hover:opacity-80"
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PartLineItems({ parts, setParts, partsInventory }) {
  const [selectedPartId, setSelectedPartId] = useState('');

  const partsOptions = partsInventory.map(p => ({ value: p.id, label: `${p.name}${p.category ? ` (${p.category})` : ''}`, item: p }));

  const addPart = () => {
    const opt = partsOptions.find(o => o.value === selectedPartId);
    if (!opt) return;
    const { item } = opt;
    setParts(prev => [...prev, {
      part_id: item.id,
      name: item.name,
      category: item.category,
      qty: 1,
      price_per_unit: item.cost_price,
      cost_price: item.cost_price,
    }]);
    setSelectedPartId('');
  };

  const updateQty = (i, qty) => {
    setParts(prev => prev.map((p, idx) => idx === i ? { ...p, qty: Math.max(1, Number(qty)) } : p));
  };

  const updatePrice = (i, price) => {
    setParts(prev => prev.map((p, idx) => idx === i ? { ...p, price_per_unit: price } : p));
  };

  const removePart = (i) => {
    setParts(prev => prev.filter((_, idx) => idx !== i));
  };

  const total = parts.reduce((s, p) => s + Number(p.price_per_unit || 0) * Number(p.qty || 1), 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-border-light space-y-4">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">รายการอะไหล่ *</label>

      {/* Part selector */}
      <div className="flex gap-2">
        <Select
          options={partsOptions}
          value={partsOptions.find(o => o.value === selectedPartId) || null}
          onChange={opt => setSelectedPartId(opt ? opt.value : '')}
          placeholder="เลือกอะไหล่จากคลัง..."
          isClearable
          noOptionsMessage={() => 'ไม่พบข้อมูลอะไหล่'}
          className="flex-1"
          styles={{
            control: (base) => ({
              ...base,
              borderRadius: '0.75rem',
              borderColor: '#E2E8F0',
              boxShadow: 'none',
              fontSize: '0.875rem',
              '&:hover': { borderColor: '#F97316' },
            }),
            menu: (base) => ({ ...base, fontSize: '0.875rem' }),
          }}
        />
        <button
          type="button"
          onClick={addPart}
          disabled={!selectedPartId}
          className="px-4 py-2 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-40 transition-colors text-sm whitespace-nowrap"
        >
          + เพิ่ม
        </button>
      </div>

      {/* Line items */}
      {parts.length > 0 && (
        <div className="space-y-2">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface-dim rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                {p.category && <p className="text-xs text-text-muted">{p.category}</p>}
              </div>
              <input
                type="number"
                min="1"
                value={p.qty}
                onChange={e => updateQty(i, e.target.value)}
                className="w-14 px-2 py-1 rounded-lg border border-border bg-white text-sm text-center outline-none focus:border-primary"
              />
              <input
                type="number"
                min="0"
                value={p.price_per_unit}
                onChange={e => updatePrice(i, e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-border bg-white text-sm text-right outline-none focus:border-primary"
              />
              <button type="button" onClick={() => removePart(i)} className="p-1 text-text-muted hover:text-danger transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-1 px-1">
            <span className="text-sm text-text-secondary">รวมทั้งหมด</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CashBillModal({ form, onClose }) {
  const [config, setConfig] = useState(DEFAULT_CASH_BILL_CONFIG);
  const receiptNumber = `TT-${(form.date || '').replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getCashBillConfig().then(setConfig);
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div>
            <h3 className="font-bold text-base">บิลเงินสด</h3>
            <p className="text-xs text-text-muted mt-0.5">เลขที่ {receiptNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm shadow-primary/25 hover:shadow-primary/40 active:scale-[0.97] transition-all"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
              พิมพ์
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:bg-surface rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh] p-4 flex justify-center">
          <ReceiptDocument config={config} data={form} receiptNumber={receiptNumber} type="cash_bill" />
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ form, onClose }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const receiptNumber = `TT-${(form.date || '').replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
  const hasConfig = config.shop_name && config.tax_id;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getReceiptConfig().then(setConfig);
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div>
            <h3 className="font-bold text-base">ใบกำกับภาษีอย่างย่อ</h3>
            <p className="text-xs text-text-muted mt-0.5">เลขที่ {receiptNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm shadow-primary/25 hover:shadow-primary/40 active:scale-[0.97] transition-all"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
              พิมพ์
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:bg-surface rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Warning if shop config is missing */}
        {!hasConfig && (
          <div className="mx-4 mt-3 px-3 py-2.5 bg-warning-bg border border-warning/30 rounded-xl flex items-start gap-2 text-xs text-warning">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">warning</span>
            <span>ยังไม่ได้ตั้งค่าข้อมูลร้าน กรุณาไปที่ <b>Operations → ตั้งค่าใบกำกับภาษี</b> เพื่อกรอกชื่อและเลขผู้เสียภาษี</span>
          </div>
        )}

        {/* Receipt content */}
        <div className="overflow-auto max-h-[60vh] p-4 flex justify-center">
          <ReceiptDocument config={config} data={form} receiptNumber={receiptNumber} />
        </div>
      </div>
    </div>
  );
}
