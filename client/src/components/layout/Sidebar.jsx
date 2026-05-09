import { NavLink, useNavigate } from 'react-router-dom';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/admin/dashboard', icon: 'dashboard', label: 'แดชบอร์ด' },
    ],
  },
  {
    label: 'Service',
    items: [
      { to: '/admin/services', icon: 'list_alt', label: 'ประวัติบริการ' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/admin/inventory', icon: 'inventory_2', label: 'ฐานข้อมูลยาง' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/import', icon: 'upload_file', label: 'นำเข้า/ส่งออก' },
      { to: '/admin/backup', icon: 'cloud_sync', label: 'สำรองข้อมูล' },
      { to: '/admin/receipt', icon: 'receipt_long', label: 'ใบเสร็จ' },
    ],
  },
];

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-primary text-white font-semibold shadow-sm shadow-primary/20'
            : 'text-text-secondary hover:bg-surface-dim hover:text-text-primary'
        }`
      }
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-r border-border h-screen w-64 hidden md:flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>tire_repair</span>
          </div>
          <h1 className="text-lg font-extrabold text-text-primary tracking-tight" style={{ fontFamily: 'Manrope' }}>TireTrack</h1>
        </div>
        <p className="text-xs text-text-muted mt-2 ml-10">ระบบจัดการร้านยาง</p>
      </div>

      {/* New Service CTA */}
      <div className="px-4 pb-2">
        <button
          onClick={() => navigate('/admin/input')}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          บันทึกบริการใหม่
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 px-3 mt-4 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.to}>
                  <NavItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </nav>
  );
}
