import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';
import { formatCurrency, formatDate, formatTireSize } from '../../utils/formatters.js';
import BrandSelect from '../../components/BrandSelect.jsx';

const MySwal = withReactContent(Swal);

export default function Inventory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [customBrands, setCustomBrands] = useState([]);

  // Form state
  const [form, setForm] = useState({
    tire_brand: '',
    tire_width: '',
    tire_aspect: '',
    tire_rim: '',
    tire_model: '',
    cost_price: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory');
      if (res.success) {
        setRecords(res.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    api.get('/tire-brands').then(res => {
      if (res.success) setCustomBrands(res.data);
    }).catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ต้องการลบข้อมูลยางนี้?',
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
        const res = await api.delete(`/inventory/${id}`);
        if (res.success) {
          setRecords(r => r.filter(rec => rec.id !== id));
          MySwal.fire({ title: 'ลบสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      } catch {
        MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#F97316' });
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    MySwal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => MySwal.showLoading()
    });

    try {
      if (editingRecord) {
        // Edit mode
        const res = await api.put(`/inventory/${editingRecord.id}`, form);
        if (res.success) {
          setRecords(r => r.map(rec => rec.id === editingRecord.id ? res.data : rec));
          setEditingRecord(null);
          MySwal.fire({ title: 'แก้ไขสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      } else {
        // Add mode
        const res = await api.post('/inventory', form);
        if (res.success) {
          setRecords([...records, res.data]);
          setIsAdding(false);
          MySwal.fire({ title: 'เพิ่มข้อมูลสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316' });
        } else {
          MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
        }
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'การเชื่อมต่อขัดข้อง';
      MySwal.fire({ title: 'ผิดพลาด', text: msg, icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const handleAddBrand = async (name) => {
    try {
      const res = await api.post('/tire-brands', { name });
      if (res.success) {
        setCustomBrands(prev => [...prev, res.data]);
        setForm(f => ({ ...f, tire_brand: name }));
      }
    } catch {}
  };

  const handleEditBrand = async (id, name) => {
    const oldName = customBrands.find(b => b.id === id)?.name;
    try {
      const res = await api.put(`/tire-brands/${id}`, { name });
      if (res.success) {
        setCustomBrands(prev => prev.map(b => b.id === id ? { ...b, name } : b));
        if (form.tire_brand === oldName) setForm(f => ({ ...f, tire_brand: name }));
        MySwal.fire({ title: 'แก้ไขสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316', timer: 1500, showConfirmButton: false });
      } else {
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const handleDeleteBrand = async (id) => {
    const removed = customBrands.find(b => b.id === id);
    // Optimistic remove
    setCustomBrands(prev => prev.filter(b => b.id !== id));
    if (form.tire_brand === removed?.name) setForm(f => ({ ...f, tire_brand: '' }));

    try {
      const res = await api.delete(`/tire-brands/${id}`);
      if (res.success) {
        MySwal.fire({ title: 'ลบสำเร็จ!', icon: 'success', confirmButtonColor: '#F97316', timer: 1200, showConfirmButton: false });
      } else {
        if (removed) setCustomBrands(prev => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)));
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      if (removed) setCustomBrands(prev => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)));
      MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาด', icon: 'error', confirmButtonColor: '#F97316' });
    }
  };

  const openAddModal = () => {
    setForm({ tire_brand: '', tire_width: '', tire_aspect: '', tire_rim: '', tire_model: '', cost_price: '' });
    setIsAdding(true);
  };

  const openEditModal = (record) => {
    setForm({
      tire_brand: record.tire_brand,
      tire_width: record.tire_width,
      tire_aspect: record.tire_aspect,
      tire_rim: record.tire_rim,
      tire_model: record.tire_model,
      cost_price: record.cost_price
    });
    setEditingRecord(record);
  };

  const closeModals = () => {
    setIsAdding(false);
    setEditingRecord(null);
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (r.tire_brand && r.tire_brand.toLowerCase().includes(q)) ||
      (formatTireSize(r.tire_width, r.tire_aspect, r.tire_rim).toLowerCase().includes(q)) ||
      (r.tire_model && r.tire_model.toLowerCase().includes(q))
    );
  });

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await api.upload('/inventory/import', file);
      if (res.success) {
        MySwal.fire({
          title: 'นำเข้าสำเร็จ!',
          text: `นำเข้า: ${res.data.imported} รายการ\nข้าม: ${res.data.skipped} รายการ, ข้อผิดพลาด: ${res.data.errors?.length || 0}`,
          icon: 'success',
          confirmButtonColor: '#F97316'
        });
        loadData();
      } else {
        MySwal.fire({ title: 'ผิดพลาด', text: res.error, icon: 'error', confirmButtonColor: '#F97316' });
      }
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการนำเข้า', icon: 'error', confirmButtonColor: '#F97316' });
    }
    setImporting(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.download('/inventory/export');
    } catch {
      MySwal.fire({ title: 'ผิดพลาด', text: 'ส่งออกไม่สำเร็จ', icon: 'error', confirmButtonColor: '#F97316' });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>ฐานข้อมูลยาง (Inventory)</h2>
          <p className="text-sm text-text-secondary mt-1">ทั้งหมด {filteredRecords.length} รายการ</p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาขนาด, ยี่ห้อ, รุ่น..."
              className="pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-sm w-full sm:w-40 lg:w-56 outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <label className="py-2 px-3 rounded-xl font-semibold text-text-secondary bg-white border border-border hover:bg-surface-dim transition-colors flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap" title="นำเข้า CSV">
            <span className="material-symbols-outlined text-lg">upload</span>
            <span className="hidden sm:inline">นำเข้า</span>
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" disabled={importing} />
          </label>

          <button onClick={handleExport} disabled={exporting} className="py-2 px-3 rounded-xl font-semibold text-text-secondary bg-white border border-border hover:bg-surface-dim transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap" title="ส่งออก CSV">
            <span className="material-symbols-outlined text-lg">download</span>
            <span className="hidden sm:inline">ส่งออก</span>
          </button>

          <button
            onClick={openAddModal}
            className="py-2 px-4 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="hidden sm:inline">เพิ่มข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-dim border-b border-border-light">
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ยี่ห้อ</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">ขนาด</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">รุ่นยาง</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider text-right">ราคาต้นทุน</th>
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
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span>
                    ไม่พบข้อมูลยาง
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  return (
                    <tr key={record.id} className="border-b border-border-light hover:bg-surface-dim/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-text-primary">{record.tire_brand}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatTireSize(record.tire_width, record.tire_aspect, record.tire_rim)}</td>
                      <td className="px-4 py-3 text-text-secondary">{record.tire_model || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary text-danger">
                        {formatCurrency(record.cost_price)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors mr-1"
                          title="แก้ไข"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
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
      </div>

      {/* Add / Edit Modal */}
      {(isAdding || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              {isAdding ? 'เพิ่มข้อมูลยาง' : 'แก้ไขข้อมูลยาง'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ยี่ห้อยาง *</label>
                <BrandSelect
                  value={form.tire_brand}
                  onChange={brand => setForm(f => ({ ...f, tire_brand: brand }))}
                  customBrands={customBrands}
                  onAdd={handleAddBrand}
                  onEdit={handleEditBrand}
                  onDelete={handleDeleteBrand}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">ขนาดยาง *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    type="number"
                    placeholder="215"
                    min="1"
                    value={form.tire_width}
                    onChange={e => setForm({...form, tire_width: e.target.value})}
                    className="w-20 px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary text-center font-medium"
                  />
                  <span className="text-text-muted font-semibold text-lg">/</span>
                  <input
                    type="number"
                    placeholder="45"
                    min="1"
                    value={form.tire_aspect}
                    onChange={e => setForm({...form, tire_aspect: e.target.value})}
                    className="w-16 px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary text-center font-medium"
                  />
                  <span className="text-text-muted font-semibold text-base">R</span>
                  <input
                    required
                    type="number"
                    placeholder="17"
                    min="1"
                    value={form.tire_rim}
                    onChange={e => setForm({...form, tire_rim: e.target.value})}
                    className="w-16 px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary text-center font-medium"
                  />
                </div>
                {form.tire_width && form.tire_rim && (
                  <p className="mt-1.5 text-xs text-text-muted">
                    ขนาด: <span className="font-semibold text-primary">{formatTireSize(form.tire_width, form.tire_aspect, form.tire_rim)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">รุ่นยาง</label>
                <input
                  type="text"
                  placeholder="เช่น Primacy 4"
                  value={form.tire_model}
                  onChange={e => setForm({...form, tire_model: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ราคาต้นทุน (บาท) *</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={form.cost_price}
                  onChange={e => setForm({...form, cost_price: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-surface-dim hover:bg-border transition-colors text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors text-sm"
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
