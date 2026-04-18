import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { SERVICE_TYPE_MAP } from '../../utils/constants.js';
import { formatCurrency, formatTimeAgo, formatDate } from '../../utils/formatters.js';

export default function RecentEntries() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services?limit=20');
      if (res.success) {
        setRecords(res.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, []);

  const handleUndo = async (id) => {
    setDeleting(id);
    try {
      const res = await api.delete(`/services/${id}`);
      if (res.success) {
        setRecords(r => r.filter(rec => rec.id !== id));
      } else {
        alert(res.error || 'ลบไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border-light px-4 py-3">
        <h1 className="text-lg font-bold" style={{ fontFamily: 'Manrope' }}>รายการล่าสุด</h1>
        <p className="text-xs text-text-muted">{records.length} รายการ</p>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {records.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-border mb-3 block">inbox</span>
            <p className="text-text-muted text-sm">ยังไม่มีรายการ</p>
          </div>
        ) : (
          records.map(record => {
            const sType = SERVICE_TYPE_MAP[record.service_type];
            const canUndo = record.created_by === 'tech' &&
              (Date.now() - new Date(record.created_at).getTime()) < 30 * 60 * 1000;

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl p-4 border border-border-light animate-fade-in"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${sType?.color}15` }}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: sType?.color, fontVariationSettings: "'FILL' 1" }}
                    >
                      {sType?.icon || 'build'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{sType?.label || record.service_type}</span>
                      <span className="text-xs text-text-muted">{formatTimeAgo(record.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-medium bg-surface-dim px-2 py-0.5 rounded-md">{record.license_plate}</span>
                      {record.car_model && <span>{record.car_model}</span>}
                    </div>
                    {record.service_type === 'tire_change' && record.tire_brand && (
                      <p className="text-xs text-text-muted mt-1">
                        {record.tire_brand} {record.tire_model} {record.tire_size} × {record.quantity}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary text-sm">{formatCurrency(record.total_price)}</span>
                      {canUndo && (
                        <button
                          onClick={() => handleUndo(record.id)}
                          disabled={deleting === record.id}
                          className="text-xs text-danger font-medium px-2 py-1 rounded-lg hover:bg-danger-bg transition-colors flex items-center gap-1"
                        >
                          {deleting === record.id ? (
                            <div className="w-3 h-3 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-sm">undo</span>
                          )}
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
