import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';
import { SERVICE_TYPE_MAP, TIRE_BRANDS } from '../../utils/constants.js';
import { formatDate } from '../../utils/formatters.js';

const MySwal = withReactContent(Swal);

function TimeRemaining({ expiresAt }) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return <span className="text-danger text-xs">หมดอายุแล้ว</span>;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return (
    <span className="text-text-muted text-xs">
      {hours > 0 ? `${hours} ชม. ` : ''}{minutes} นาที
    </span>
  );
}

export default function RecycleBin() {
  const [activeTab, setActiveTab] = useState('service');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/recycle?type=${activeTab}`);
      if (res.success) setItems(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [activeTab]);

  const handleRestore = async (id) => {
    const result = await MySwal.fire({
      title: 'กู้คืนข้อมูลนี้?',
      text: 'รายการจะถูกนำกลับไปยังที่เดิม',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#F97316',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'กู้คืน',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.post(`/recycle/${id}/restore`);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        MySwal.fire({ title: 'กู้คืนสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
      } else {
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const handleDeletePermanent = async (id) => {
    const result = await MySwal.fire({
      title: 'ลบถาวร?',
      text: 'ข้อมูลจะไม่สามารถกู้คืนได้อีก',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ลบถาวร',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/recycle/${id}`);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
      }
    } catch {}
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    const result = await MySwal.fire({
      title: 'ล้างถังขยะทั้งหมด?',
      text: `รายการทั้งหมด ${items.length} รายการจะถูกลบถาวร`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ล้างทั้งหมด',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/recycle/clear?type=${activeTab}`);
      if (res.success) setItems([]);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>ถังขยะ</h2>
          <p className="text-sm text-text-secondary mt-1">รายการที่ถูกลบจะถูกลบออกอัตโนมัติใน 1 วัน</p>
        </div>
        <button
          onClick={handleClearAll}
          disabled={items.length === 0}
          className="py-2 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-lg">delete_forever</span>
          ล้างถังขยะ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-dim rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'service' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          ประวัติบริการ
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inventory' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          ฐานข้อมูลยาง
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-dim border-b border-border-light">
                {activeTab === 'service' ? (
                  <>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">วันที่</th>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ทะเบียน</th>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ประเภท</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ยี่ห้อ</th>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ขนาด</th>
                    <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">รุ่น</th>
                  </>
                )}
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ลบอีก</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-4xl block mb-2">delete_sweep</span>
                    ถังขยะว่างเปล่า
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-b border-border-light hover:bg-surface-dim/50 transition-colors">
                    {activeTab === 'service' ? (
                      <>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(item.data.date)}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-text-primary bg-surface-dim px-2 py-0.5 rounded">
                            {item.data.license_plate || '-'}
                          </span>
                          {item.data.car_model && <span className="text-xs text-text-muted ml-2">{item.data.car_model}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const sType = SERVICE_TYPE_MAP[item.data.service_type];
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: `${sType?.color || '#CBD5E1'}12`, color: sType?.color }}
                              >
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                                  {sType?.icon}
                                </span>
                                {sType?.label}
                              </span>
                            );
                          })()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-semibold text-text-primary">
                          {TIRE_BRANDS.find(b => b.code === item.data.tire_brand)?.label || item.data.tire_brand}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.data.tire_size}</td>
                        <td className="px-4 py-3 text-text-secondary">{item.data.tire_model || '-'}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <TimeRemaining expiresAt={item.expiresAt} />
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors mr-1 focus-visible:ring-2 focus-visible:ring-primary"
                        title="กู้คืน"
                      >
                        <span className="material-symbols-outlined text-lg">restore</span>
                      </button>
                      <button
                        onClick={() => handleDeletePermanent(item.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-colors focus-visible:ring-2 focus-visible:ring-danger"
                        title="ลบถาวร"
                      >
                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
