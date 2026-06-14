import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatters.js';

const MySwal = withReactContent(Swal);

const CATEGORIES = ['น้ำมันเครื่อง', 'น้ำมันเกียร์', 'น้ำมันเบรก', 'ไส้กรอง', 'เบรก', 'ช่วงล่าง', 'ไฟ', 'อื่นๆ'];

export default function PartsInventory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [form, setForm] = useState({ name: '', category: '', cost_price: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/parts-inventory');
      if (res.success) setRecords(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ต้องการลบอะไหล่นี้?',
      text: 'คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F97316',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/parts-inventory/${id}`);
      if (res.success) {
        setRecords(r => r.filter(rec => rec.id !== id));
        MySwal.fire({ title: 'ลบสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
      } else {
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    MySwal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => MySwal.showLoading() });
    try {
      if (editingRecord) {
        const res = await api.put(`/parts-inventory/${editingRecord.id}`, form);
        if (res.success) {
          setRecords(r => r.map(rec => rec.id === editingRecord.id ? res.data : rec));
          setEditingRecord(null);
          MySwal.fire({ title: 'แก้ไขสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      } else {
        const res = await api.post('/parts-inventory', form);
        if (res.success) {
          setRecords(r => [...r, res.data]);
          setIsAdding(false);
          MySwal.fire({ title: 'เพิ่มข้อมูลสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      }
    } catch (err) {
      MySwal.fire({ title: 'ผิดพลาด', text: typeof err === 'string' ? err : 'การเชื่อมต่อขัดข้อง', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const openAddModal = () => {
    setForm({ name: '', category: '', cost_price: '' });
    setIsAdding(true);
  };

  const openEditModal = (record) => {
    setForm({ name: record.name, category: record.category, cost_price: record.cost_price });
    setEditingRecord(record);
  };

  const closeModals = () => { setIsAdding(false); setEditingRecord(null); };

  const filteredRecords = records.filter(r =>
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>คลังอะไหล่</h2>
          <p className="text-sm text-text-secondary mt-1">ทั้งหมด {filteredRecords.length} รายการ</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, หมวดหมู่..."
              className="pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-sm w-full sm:w-48 outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={openAddModal}
            className="py-2 px-4 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="hidden sm:inline">เพิ่มอะไหล่</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-dim border-b border-border-light">
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ชื่ออะไหล่</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">หมวดหมู่</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-right">ราคาต้นทุน</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-4xl block mb-2">build</span>
                    ไม่พบข้อมูลอะไหล่
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="border-b border-border-light hover:bg-surface-dim/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-text-primary">{record.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-pink-50 text-pink-600 font-medium">{record.category || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(record.cost_price)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => openEditModal(record)} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors mr-1" title="แก้ไข">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-colors" title="ลบ">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAdding || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              {isAdding ? 'เพิ่มอะไหล่' : 'แก้ไขอะไหล่'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ชื่ออะไหล่ *</label>
                <input
                  required
                  type="text"
                  placeholder="เช่น น้ำมันเครื่อง Shell Helix 5W-30"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">หมวดหมู่</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ราคาต้นทุน (บาท) *</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModals} className="flex-1 py-2.5 rounded-xl font-semibold bg-surface-dim hover:bg-border transition-colors text-sm">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors text-sm">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
