import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { api } from '../../services/api.js';

const MySwal = withReactContent(Swal);

export default function BackupSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadConfig = async () => {
    try {
      const res = await api.get('/backup/status');
      if (res.success) {
        setConfig(res.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/backup/settings', {
        autoEnabled: config.autoEnabled,
        schedule: config.schedule
      });
      if (res.success) {
        setConfig(res.data);
        MySwal.fire({
          title: 'บันทึกสำเร็จ',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch {
      MySwal.fire('ผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้', 'error');
    }
    setSaving(false);
  };

  const handleBackupNow = async () => {
    setActionLoading(true);
    MySwal.fire({
      title: 'กำลังสำรองข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => MySwal.showLoading()
    });

    try {
      const res = await api.post('/backup/now');
      if (res.success) {
        loadConfig();
        MySwal.fire('สำเร็จ', 'สำรองข้อมูลไปยัง S3 แล้ว', 'success');
      } else {
        MySwal.fire('ผิดพลาด', res.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      MySwal.fire('ผิดพลาด', 'เชื่อมต่อ S3 ไม่สำเร็จ', 'error');
    }
    setActionLoading(false);
  };

  const handleRestore = async () => {
    const confirm = await MySwal.fire({
      title: 'กู้คืนข้อมูล?',
      text: 'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจาก S3 ทั้งหมด คุณแน่ใจหรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'กู้คืนข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#F97316'
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    MySwal.fire({
      title: 'กำลังกู้คืนข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => MySwal.showLoading()
    });

    try {
      const res = await api.post('/backup/restore');
      if (res.success) {
        MySwal.fire('สำเร็จ', 'กู้คืนข้อมูลจาก S3 แล้ว', 'success');
      } else {
        MySwal.fire('ผิดพลาด', res.error || 'ไม่พบไฟล์สำรองหรือเกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      MySwal.fire('ผิดพลาด', 'เชื่อมต่อ S3 ไม่สำเร็จ', 'error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>สำรองข้อมูล (S3 Backup)</h2>
        <p className="text-sm text-text-secondary mt-1">ตั้งค่าการสำรองข้อมูลอัตโนมัติและกู้คืน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Settings Card */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary">cloud_sync</span>
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Manrope' }}>การสำรองข้อมูลอัตโนมัติ</h3>
              <p className="text-xs text-text-muted">สำรองไปยัง MinIO S3 ตามเวลาที่กำหนด</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">เปิดใช้งาน Auto Backup</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config?.autoEnabled || false}
                  onChange={e => setConfig({...config, autoEnabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {config?.autoEnabled && (
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">ความถี่ (Schedule)</label>
                <select 
                  value={config.schedule}
                  onChange={e => setConfig({...config, schedule: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-dim outline-none focus:border-primary text-sm"
                >
                  <option value="0 * * * *">รายชั่วโมง (ทุกต้นชั่วโมง)</option>
                  <option value="0 2 * * *">รายวัน (02:00 น.)</option>
                  <option value="0 2 * * 0">รายสัปดาห์ (วันอาทิตย์ 02:00 น.)</option>
                  <option value="0 2 1 * *">รายเดือน (วันที่ 1 02:00 น.)</option>
                </select>
              </div>
            )}

            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-semibold text-white bg-text-primary hover:bg-black transition-colors text-sm"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </form>
        </div>

        {/* Status & Actions Card */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-surface-dim flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-text-primary">info</span>
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Manrope' }}>สถานะปัจจุบัน</h3>
            </div>
          </div>

          <div className="bg-surface-dim p-4 rounded-xl mb-6">
            <p className="text-xs text-text-muted mb-1">สำรองข้อมูลล่าสุด</p>
            <p className="font-semibold text-sm">
              {config?.lastBackup ? new Date(config.lastBackup).toLocaleString('th-TH') : 'ยังไม่เคยสำรองข้อมูล'}
            </p>
            {config?.lastStatus && (
              <p className={`text-xs mt-2 font-medium ${config.lastStatus === 'success' ? 'text-success' : 'text-danger'}`}>
                สถานะ: {config.lastStatus === 'success' ? 'สำเร็จ' : config.lastStatus}
              </p>
            )}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <button 
              onClick={handleBackupNow}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-lg">backup</span>
              สำรองทันที
            </button>
            <button 
              onClick={handleRestore}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-danger bg-danger-bg hover:bg-red-100 transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-lg">settings_backup_restore</span>
              กู้คืนข้อมูล
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
