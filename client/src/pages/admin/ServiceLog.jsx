import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';
import { SERVICE_TYPES, SERVICE_TYPE_MAP, CAR_COLORS, PROVINCES } from '../../utils/constants.js';
import { formatCurrency, formatDate, formatTireSize } from '../../utils/formatters.js';

const MySwal = withReactContent(Swal);

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-text-primary">{value || '-'}</p>
    </div>
  );
}

export default function ServiceLog() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [detailRecord, setDetailRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get('/inventory')
      .then(res => { if (res.success) setInventory(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = (detailRecord || editingRecord) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [detailRecord, editingRecord]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      let url = `/services?page=${page}&limit=20`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterType) url += `&type=${filterType}`;
      const res = await api.get(url);
      if (res.success) {
        setRecords(res.data);
        setMeta(res.meta);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [page, filterType]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ต้องการลบรายการนี้ใช่ไหม?',
      text: 'คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F97316',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });
    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/services/${id}`);
        if (res.success) {
          setRecords(r => r.filter(rec => rec.id !== id));
          MySwal.fire({ title: 'ลบสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      } catch {
        MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', icon: 'error', confirmButtonColor: '#F97316' });
      }
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    MySwal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => MySwal.showLoading() });
    try {
      const res = await api.put(`/services/${editingRecord.id}`, editingRecord);
      if (res.success) {
        setRecords(r => r.map(rec => rec.id === editingRecord.id ? res.data : rec));
        setEditingRecord(null);
        MySwal.fire({ title: 'แก้ไขสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
      } else {
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'เชื่อมต่อขัดข้อง', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const tireOptions = inventory.map(item => ({
    id: item.id,
    label: [item.tire_brand, item.tire_model, formatTireSize(item.tire_width, item.tire_aspect, item.tire_rim)]
      .filter(Boolean).join(' '),
    tire_brand: item.tire_brand,
    tire_model: item.tire_model,
    tire_size: formatTireSize(item.tire_width, item.tire_aspect, item.tire_rim),
    cost_price: item.cost_price,
  }));

  const getSelectedTireId = (rec) => {
    const match = inventory.find(item =>
      item.tire_brand === rec.tire_brand &&
      item.tire_model === rec.tire_model &&
      formatTireSize(item.tire_width, item.tire_aspect, item.tire_rim) === rec.tire_size
    );
    return match ? match.id : '__current__';
  };

  const handleTireSelect = (optionId) => {
    if (optionId === '__current__') return;
    const opt = tireOptions.find(o => o.id === optionId);
    if (opt) {
      setEditingRecord(r => ({
        ...r,
        tire_brand: opt.tire_brand,
        tire_model: opt.tire_model,
        tire_size: opt.tire_size,
        cost_price: opt.cost_price,
      }));
    }
  };

  const setField = (key) => (e) => setEditingRecord(r => ({ ...r, [key]: e.target.value }));

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary transition-colors text-sm';
  const labelCls = 'text-xs font-semibold text-text-secondary mb-1.5 block';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>ประวัติบริการ</h2>
          <p className="text-sm text-text-secondary mt-1">ทั้งหมด {meta.total} รายการ</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <form onSubmit={handleSearch} className="relative w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาทะเบียน, รุ่นรถ..."
              className="pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-sm w-full sm:w-56 outline-none focus:border-primary transition-colors"
            />
          </form>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary"
          >
            <option value="">ทุกประเภท</option>
            {SERVICE_TYPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-dim border-b border-border-light">
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">วันที่</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ทะเบียน</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">หมายเหตุ</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ประเภท</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">รายละเอียด</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-right">ราคา</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-center w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const sType = SERVICE_TYPE_MAP[record.service_type];
                  const notePreview = record.notes
                    ? (record.notes.length > 10 ? record.notes.slice(0, 10) + '…' : record.notes)
                    : '';
                  return (
                    <tr
                      key={record.id}
                      onClick={() => setDetailRecord(record)}
                      className="border-b border-border-light hover:bg-surface-dim/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-text-primary bg-surface-dim px-2 py-0.5 rounded">{record.license_plate || '-'}</span>
                        {record.province && <span className="text-xs text-text-muted ml-1">· {record.province}</span>}
                        {record.car_model && <span className="text-xs text-text-muted ml-2">{record.car_model}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted max-w-[96px]">
                        {notePreview || <span className="text-border-light select-none">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: `${sType?.color || '#CBD5E1'}18`, color: sType?.color }}
                        >
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {sType?.icon}
                          </span>
                          {sType?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {record.service_type === 'tire_change' ? (
                          <span>
                            {record.tire_brand}
                            {record.tire_model ? ` ${record.tire_model}` : ''}
                            {record.tire_size ? ` (${record.tire_size})` : ''}
                            {record.quantity ? ` × ${record.quantity}` : ''}
                          </span>
                        ) : record.service_type === 'part_change' && Array.isArray(record.parts) && record.parts.length > 0 ? (
                          <span>{record.parts.map(p => `${p.name} ×${p.qty}`).join(', ')}</span>
                        ) : (
                          <span className="text-text-muted">{record.notes || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                        {formatCurrency(record.total_price)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailRecord(record); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRecord({ ...record }); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors"
                          title="แก้ไข"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-colors"
                          title="ลบ"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-light bg-surface-dim/30">
            <span className="text-xs text-text-muted">หน้า {page} / {meta.pages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-border hover:bg-surface-dim disabled:opacity-40 transition-colors"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-border hover:bg-surface-dim disabled:opacity-40 transition-colors"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailRecord && (() => {
        const sType = SERVICE_TYPE_MAP[detailRecord.service_type];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm"
            onClick={() => setDetailRecord(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${sType?.color || '#CBD5E1'}18` }}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: sType?.color, fontVariationSettings: "'FILL' 1" }}
                    >
                      {sType?.icon || 'receipt_long'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Manrope' }}>
                      {detailRecord.license_plate || 'ไม่ระบุทะเบียน'}
                      {detailRecord.province
                        ? <span className="text-sm font-normal text-text-muted ml-2">· {detailRecord.province}</span>
                        : null}
                    </h3>
                    <p className="text-xs text-text-muted">{formatDate(detailRecord.date)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailRecord(null)}
                  className="p-2 rounded-xl hover:bg-surface-dim transition-colors text-text-muted hover:text-text-primary flex-shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {/* Service type badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: `${sType?.color || '#CBD5E1'}18`, color: sType?.color }}
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {sType?.icon}
                  </span>
                  {sType?.label || detailRecord.service_type}
                </span>

                {/* Car info */}
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">ข้อมูลรถ</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <DetailField label="รุ่นรถ" value={detailRecord.car_model} />
                    <DetailField label="สีรถ" value={detailRecord.car_color} />
                  </div>
                </div>

                <div className="border-t border-border-light" />

                {/* Tire details */}
                {detailRecord.service_type === 'tire_change' && (
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">รายละเอียดยาง</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <DetailField label="ยี่ห้อ" value={detailRecord.tire_brand} />
                      <DetailField label="รุ่น" value={detailRecord.tire_model} />
                      <DetailField label="ขนาด" value={detailRecord.tire_size} />
                      <DetailField
                        label="จำนวน"
                        value={detailRecord.quantity ? `${detailRecord.quantity} เส้น` : null}
                      />
                      <DetailField
                        label="ราคา / เส้น"
                        value={detailRecord.price_per_unit ? formatCurrency(detailRecord.price_per_unit) : null}
                      />
                      <DetailField
                        label="ต้นทุน / เส้น"
                        value={detailRecord.cost_price && detailRecord.cost_price !== '0'
                          ? formatCurrency(detailRecord.cost_price)
                          : null}
                      />
                    </div>
                  </div>
                )}

                {/* Parts table */}
                {detailRecord.service_type === 'part_change' &&
                  Array.isArray(detailRecord.parts) && detailRecord.parts.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">รายการอะไหล่</p>
                    <div className="rounded-xl border border-border-light overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-dim">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">รายการ</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-text-secondary">จำนวน</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-text-secondary">ราคา / ชิ้น</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRecord.parts.map((p, i) => (
                            <tr key={i} className="border-t border-border-light">
                              <td className="px-3 py-2 text-text-primary">{p.name}</td>
                              <td className="px-3 py-2 text-center text-text-secondary">×{p.qty}</td>
                              <td className="px-3 py-2 text-right text-text-secondary">{formatCurrency(p.price_per_unit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Total price */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-sm font-semibold text-text-secondary">ราคารวม</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(detailRecord.total_price)}</span>
                </div>

                <div className="border-t border-border-light" />

                {/* Staff & notes */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailField label="ช่างผู้ให้บริการ" value={detailRecord.technician} />
                  <DetailField label="บันทึกโดย" value={detailRecord.created_by} />
                </div>

                {detailRecord.notes ? (
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">หมายเหตุ</p>
                    <p className="text-sm text-text-primary bg-surface-dim rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                      {detailRecord.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-6 py-4 border-t border-border-light flex-shrink-0">
                <button
                  onClick={() => { setDetailRecord(null); setEditingRecord({ ...detailRecord }); }}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-primary border border-primary hover:bg-primary/5 transition-colors text-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  แก้ไข
                </button>
                <button
                  onClick={() => setDetailRecord(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-surface-dim hover:bg-border transition-colors text-sm"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Edit Modal ── */}
      {editingRecord && (() => {
        const sType = SERVICE_TYPE_MAP[editingRecord.service_type];
        const isTireChange = editingRecord.service_type === 'tire_change';
        const selectedTireId = getSelectedTireId(editingRecord);
        const hasCurrentTire = !!(editingRecord.tire_brand || editingRecord.tire_size);
        const noInventoryMatch = selectedTireId === '__current__' && hasCurrentTire;
        const computedTotal = isTireChange
          ? Number(editingRecord.quantity || 0) * Number(editingRecord.price_per_unit || 0)
          : Number(editingRecord.total_price || 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light flex-shrink-0">
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Manrope' }}>แก้ไขข้อมูลบริการ</h3>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="p-2 rounded-xl hover:bg-surface-dim transition-colors text-text-muted hover:text-text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable form body */}
              <form
                id="edit-service-form"
                onSubmit={handleEditSave}
                className="overflow-y-auto flex-1 px-6 py-5 space-y-4"
              >
                {/* Service type — read-only */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">ประเภทบริการ:</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: `${sType?.color || '#CBD5E1'}18`, color: sType?.color }}
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {sType?.icon}
                    </span>
                    {sType?.label || editingRecord.service_type}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <label className={labelCls}>วันที่</label>
                  <input
                    type="date"
                    value={editingRecord.date}
                    onChange={setField('date')}
                    className={inputCls}
                  />
                </div>

                {/* License plate + province */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>ทะเบียนรถ</label>
                    <input
                      type="text"
                      value={editingRecord.license_plate}
                      onChange={setField('license_plate')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>จังหวัด</label>
                    <select value={editingRecord.province} onChange={setField('province')} className={inputCls}>
                      <option value="">เลือกจังหวัด...</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Car model + color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>รุ่นรถ</label>
                    <input
                      type="text"
                      value={editingRecord.car_model}
                      onChange={setField('car_model')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>สีรถ</label>
                    <select value={editingRecord.car_color} onChange={setField('car_color')} className={inputCls}>
                      <option value="">เลือกสี...</option>
                      {CAR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t border-border-light" />

                {/* tire_change fields */}
                {isTireChange && (
                  <>
                    <div>
                      <label className={labelCls}>ยางรถยนต์</label>
                      <select
                        value={selectedTireId}
                        onChange={e => handleTireSelect(e.target.value)}
                        className={inputCls}
                      >
                        {selectedTireId === '__current__' && (
                          <option value="__current__">
                            {hasCurrentTire
                              ? [editingRecord.tire_brand, editingRecord.tire_model, editingRecord.tire_size]
                                  .filter(Boolean).join(' ')
                              : 'เลือกยาง...'}
                          </option>
                        )}
                        {tireOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      {noInventoryMatch && (
                        <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          ยางปัจจุบันไม่พบในคลังสินค้า — เลือกจากรายการเพื่ออัปเดต
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>จำนวน (เส้น)</label>
                        <input
                          type="number"
                          min="1"
                          value={editingRecord.quantity}
                          onChange={setField('quantity')}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>ราคา / เส้น (฿)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingRecord.price_per_unit}
                          onChange={setField('price_per_unit')}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
                      <span className="text-xs font-semibold text-text-secondary">ราคารวม (คำนวณอัตโนมัติ)</span>
                      <span className="font-bold text-primary">{formatCurrency(computedTotal)}</span>
                    </div>
                  </>
                )}

                {/* non-tire_change: editable total */}
                {!isTireChange && (
                  <div>
                    <label className={labelCls}>ราคารวม (฿)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecord.total_price}
                      onChange={setField('total_price')}
                      className={inputCls}
                    />
                  </div>
                )}

                <div className="border-t border-border-light" />

                {/* Technician */}
                <div>
                  <label className={labelCls}>ช่างผู้ให้บริการ</label>
                  <input
                    type="text"
                    value={editingRecord.technician}
                    onChange={setField('technician')}
                    className={inputCls}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>หมายเหตุ</label>
                  <textarea
                    value={editingRecord.notes}
                    onChange={setField('notes')}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </form>

              {/* Footer */}
              <div className="flex gap-2 px-6 py-4 border-t border-border-light flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-surface-dim hover:bg-border transition-colors text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="edit-service-form"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors text-sm"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
