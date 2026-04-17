import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { SERVICE_TYPES, SERVICE_TYPE_MAP, TIRE_BRANDS } from '../../utils/constants.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export default function ServiceLog() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [expanded, setExpanded] = useState(null);

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
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;
    try {
      const res = await api.delete(`/services/${id}`);
      if (res.success) {
        setRecords(r => r.filter(rec => rec.id !== id));
      } else {
        alert(res.error);
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
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
                        <span className="font-semibold text-text-primary bg-surface-dim px-2 py-0.5 rounded">{record.license_plate}</span>
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
                      <td className="px-4 py-3 text-center">
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
    </div>
  );
}
