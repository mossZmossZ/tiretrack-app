import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';
import { SERVICE_TYPES, SERVICE_TYPE_MAP, TIRE_BRANDS } from '../../utils/constants.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const MySwal = withReactContent(Swal);

export default function ServiceLog() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [expanded, setExpanded] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

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
      text: "คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F97316',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก'
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
    
    MySwal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => MySwal.showLoading()
    });

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>ประวัติบริการ</h2>
          <p className="text-sm text-text-secondary mt-1">ทั้งหมด {meta.total} รายการ</p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาทะเบียน, รุ่นรถ..."
              className="pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-sm w-56 outline-none focus:border-primary transition-colors"
            />
          </form>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary"
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
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ประเภท</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">รายละเอียด</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-right">ราคา</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-center w-16">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const sType = SERVICE_TYPE_MAP[record.service_type];
                  const isExpanded = expanded === record.id;
                  return (
                    <tr
                      key={record.id}
                      onClick={() => setExpanded(isExpanded ? null : record.id)}
                      className="border-b border-border-light hover:bg-surface-dim/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-text-primary bg-surface-dim px-2 py-0.5 rounded">{record.license_plate || '-'}</span>
                        {record.car_model && <span className="text-xs text-text-muted ml-2">{record.car_model}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: `${sType?.color || '#CBD5E1'}12`, color: sType?.color }}
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
                            {TIRE_BRANDS.find(b => b.code === record.tire_brand)?.label || record.tire_brand}
                            {record.tire_model ? ` ${record.tire_model}` : ''}
                            {record.tire_size ? ` (${record.tire_size})` : ''}
                            {record.quantity ? ` × ${record.quantity}` : ''}
                          </span>
                        ) : (
                          <span>{record.notes || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                        {formatCurrency(record.total_price)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRecord({...record}); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors mr-1"
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

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>แก้ไขข้อมูลบริการ</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ทะเบียนรถ</label>
                <input
                  type="text"
                  value={editingRecord.license_plate}
                  onChange={e => setEditingRecord({...editingRecord, license_plate: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                />
              </div>
              
              {editingRecord.service_type === 'tire_change' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">จำนวน (เส้น)</label>
                      <input
                        type="number"
                        value={editingRecord.quantity}
                        onChange={e => setEditingRecord({...editingRecord, quantity: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">ราคา/เส้น</label>
                      <input
                        type="number"
                        value={editingRecord.price_per_unit}
                        onChange={e => setEditingRecord({...editingRecord, price_per_unit: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1 block">ยี่ห้อยาง</label>
                    <select
                      value={editingRecord.tire_brand}
                      onChange={e => setEditingRecord({...editingRecord, tire_brand: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none"
                    >
                      <option value="">เลือก... </option>
                      {TIRE_BRANDS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">ราคารวม</label>
                  <input
                    type="number"
                    value={editingRecord.total_price}
                    onChange={e => setEditingRecord({...editingRecord, total_price: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none"
                  />
                </div>
              )}
              
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">หมายเหตุ</label>
                <textarea
                  value={editingRecord.notes}
                  onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-surface-dim hover:bg-border transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
