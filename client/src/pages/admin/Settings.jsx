import { useState } from 'react';
import ImportExport from './ImportExport.jsx';
import BackupSettings from './BackupSettings.jsx';
import ReceiptSettings from './ReceiptSettings.jsx';
import CashBillSettings from './CashBillSettings.jsx';

const TABS = [
  { key: 'import', label: 'นำเข้า/ส่งออก', icon: 'upload_file' },
  { key: 'backup', label: 'สำรองข้อมูล', icon: 'cloud_sync' },
  { key: 'receipt', label: 'ใบกำกับภาษี', icon: 'receipt_long' },
  { key: 'cashbill', label: 'บิลเงินสด', icon: 'receipt' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>ตั้งค่า</h2>
        <p className="text-sm text-text-secondary mt-1">จัดการการตั้งค่าและการดำเนินการของระบบ</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-dim rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'import' && <ImportExport />}
        {activeTab === 'backup' && <BackupSettings />}
        {activeTab === 'receipt' && <ReceiptSettings />}
        {activeTab === 'cashbill' && <CashBillSettings />}
      </div>
    </div>
  );
}
