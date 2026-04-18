import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: 'dashboard', label: 'แดชบอร์ด' },
  { to: '/admin/services', icon: 'list_alt', label: 'ประวัติบริการ' },
  { to: '/admin/inventory', icon: 'inventory_2', label: 'ฐานข้อมูลยาง' },
  { to: '/admin/import', icon: 'upload_file', label: 'นำเข้า/ส่งออก' },
  { to: '/admin/backup', icon: 'cloud_sync', label: 'สำรองข้อมูล' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-r border-border h-screen w-64 hidden md:flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>tire_repair</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-text-primary tracking-tight" style={{ fontFamily: 'Manrope' }}>TireTrack</h1>
          </div>
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

      {/* Navigation */}
      <ul className="flex-1 px-3 space-y-1 mt-4">
        {NAV_ITEMS.map(item => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary font-semibold shadow-sm'
                    : 'text-text-secondary hover:bg-surface-dim hover:text-text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="p-4 border-t border-border-light">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-danger-bg hover:text-danger transition-all w-full"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
}
