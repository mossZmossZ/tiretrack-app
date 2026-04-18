import { useState } from 'react';
import { api } from '../../services/api.js';

export default function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await api.upload('/services/import', file);
      if (res.success) {
        setResult({
          success: true,
          message: `นำเข้าสำเร็จ ${res.data.imported} รายการ`,
          details: res.data
        });
      } else {
        setResult({ success: false, message: res.error });
      }
    } catch {
      setResult({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้า' });
    }
    setImporting(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.download('/services/export');
    } catch {
      alert('ส่งออกไม่สำเร็จ');
    }
    setExporting(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleImport(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleImport(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>นำเข้า / ส่งออก</h2>
        <p className="text-sm text-text-secondary mt-1">จัดการข้อมูลบริการ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary">upload_file</span>
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Manrope' }}>นำเข้าข้อมูล Legacy</h3>
              <p className="text-xs text-text-muted">อัปโหลดไฟล์ CSV จาก Google Sheets</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragOver
                ? 'border-primary bg-primary-50'
                : 'border-border hover:border-primary-light'
            }`}
          >
            {importing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-text-secondary">กำลังนำเข้า...</p>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-text-muted mb-2 block">cloud_upload</span>
                <p className="text-sm text-text-secondary mb-3">ลากไฟล์ CSV มาวางที่นี่</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors">
                  <span className="material-symbols-outlined text-lg">folder_open</span>
                  เลือกไฟล์
                  <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                </label>
              </>
            )}
          </div>

          {/* Legacy format info */}
          <div className="mt-4 p-3 bg-surface-dim rounded-xl">
            <p className="text-xs font-semibold text-text-secondary mb-1">รูปแบบ Legacy CSV:</p>
            <code className="text-[10px] text-text-muted leading-relaxed block">
              วันที่, ทะเบียนรถ, รถรุ่น, สี, เปลี่ยนยาง, ยี่ห้อยาง, รุ่น, ขนาดยาง, ราคา/เส้น, หมายเหตุ
            </code>
          </div>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl animate-scale-in ${
              result.success ? 'bg-success-bg' : 'bg-danger-bg'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`material-symbols-outlined text-lg ${result.success ? 'text-success' : 'text-danger'}`}>
                  {result.success ? 'check_circle' : 'error'}
                </span>
                <span className={`text-sm font-semibold ${result.success ? 'text-success' : 'text-danger'}`}>
                  {result.message}
                </span>
              </div>
              {result.details && (
                <div className="text-xs text-text-secondary mt-2 space-y-0.5">
                  <p>นำเข้า: {result.details.imported} รายการ</p>
                  {result.details.skipped > 0 && <p>ข้าม: {result.details.skipped} รายการ</p>}
                  {result.details.errors?.length > 0 && (
                    <div className="mt-1">
                      <p className="text-danger">ข้อผิดพลาด:</p>
                      {result.details.errors.map((e, i) => (
                        <p key={i} className="text-danger">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-success">download</span>
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Manrope' }}>ส่งออกข้อมูล</h3>
              <p className="text-xs text-text-muted">ดาวน์โหลดข้อมูลเป็น CSV</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary mb-4">
            ส่งออกข้อมูลทั้งหมดเป็นไฟล์ CSV พร้อม BOM สำหรับเปิดใน Excel ภาษาไทย
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-success to-emerald-600 shadow-lg shadow-success/25 disabled:opacity-50 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">download</span>
                ดาวน์โหลด CSV
              </>
            )}
          </button>

          <div className="mt-4 p-3 bg-surface-dim rounded-xl">
            <p className="text-xs text-text-muted">
              💡 ไฟล์ CSV สามารถเปิดใน Google Sheets หรือ Excel ได้โดยตรง รองรับภาษาไทย
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
