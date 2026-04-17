import { useState, useEffect, useRef } from 'react';
import { SERVICE_TYPES, TIRE_BRANDS, TIRE_SIZES, CAR_COLORS, PROVINCES, QUANTITY_OPTIONS } from '../../utils/constants.js';
import { formatCurrency, getToday } from '../../utils/formatters.js';
import { api } from '../../services/api.js';

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
    tire_size: '',
    price_per_unit: '',
    total_price: '',
    technician: '',
    notes: '',
    date: getToday(),
  });
  const [step, setStep] = useState(1); // 1=service type, 2=plate, 3=details, 4=confirm
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const plateRef = useRef(null);

  const isTireChange = form.service_type === 'tire_change';

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
    if (!form.license_plate.trim()) return;
    setSuggestions([]);
    setStep(3);
  };

  const goToConfirm = () => {
    if (isTireChange && (!form.tire_brand || !form.tire_size || !form.price_per_unit)) return;
    if (!isTireChange && !form.total_price) {
      updateForm('total_price', '0');
    }
    setStep(4);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/services', form);
      if (res.success) {
        setToast({ id: res.data.id, message: 'บันทึกสำเร็จ!' });
        // Reset form
        setForm({
          service_type: '', license_plate: '', province: '', car_model: '', car_color: '',
          quantity: '4', tire_brand: '', tire_model: '', tire_size: '',
          price_per_unit: '', total_price: '', technician: '', notes: '', date: getToday(),
        });
        setStep(1);
        // Auto-dismiss toast
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

  const currentServiceType = SERVICE_TYPES.find(s => s.value === form.service_type);

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border-light px-4 py-3">
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
              {step === 3 && (isTireChange ? 'รายละเอียดยาง' : 'รายละเอียดบริการ')}
              {step === 4 && 'ยืนยันข้อมูล'}
            </p>
          </div>
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
                  <select
                    value={form.province}
                    onChange={e => updateForm('province', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary"
                  >
                    <option value="">เลือก...</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">สี</label>
                  <select
                    value={form.car_color}
                    onChange={e => updateForm('car_color', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary"
                  >
                    <option value="">เลือก...</option>
                    {CAR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
              disabled={!form.license_plate.trim()}
              className="w-full py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none transition-all active:scale-[0.98] text-sm"
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
              <span className="text-text-muted text-sm ml-auto">{form.license_plate}</span>
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

                {/* Brand */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">ยี่ห้อยาง *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIRE_BRANDS.slice(0, 9).map(b => (
                      <button
                        key={b.code}
                        onClick={() => updateForm('tire_brand', b.code)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          form.tire_brand === b.code
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-surface-dim text-text-secondary hover:bg-border-light'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">รุ่นยาง</label>
                  <input
                    type="text"
                    value={form.tire_model}
                    onChange={e => updateForm('tire_model', e.target.value)}
                    placeholder="เช่น Primacy 4, LT Tour"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">ขนาดยาง *</label>
                  <select
                    value={form.tire_size}
                    onChange={e => updateForm('tire_size', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-dim text-sm outline-none focus:border-primary"
                  >
                    <option value="">เลือกขนาด...</option>
                    {TIRE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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

            {/* Non-tire service: just total price */}
            {!isTireChange && (
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
              disabled={isTireChange && (!form.tire_brand || !form.tire_size || !form.price_per_unit)}
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
                  <span className="font-semibold">{form.license_plate}</span>
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
                      <span>{TIRE_BRANDS.find(b => b.code === form.tire_brand)?.label} {form.tire_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">ขนาด</span>
                      <span>{form.tire_size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">ราคา/เส้น</span>
                      <span>{formatCurrency(form.price_per_unit)}</span>
                    </div>
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

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-4 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 disabled:opacity-50 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 animate-toast z-50 ${
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
