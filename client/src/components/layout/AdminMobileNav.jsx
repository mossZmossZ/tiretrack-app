import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminMobileNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mobile-nav glass border-t border-border-light md:hidden">
      <div className="flex items-center justify-between py-2 px-6 max-w-md mx-auto">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          <span className="text-[10px] font-semibold">แดชบอร์ด</span>
        </NavLink>

        <NavLink
          to="/admin/services"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">list_alt</span>
          <span className="text-[10px] font-semibold">ประวัติ</span>
        </NavLink>
        
        <NavLink
          to="/admin/inventory"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="text-[10px] font-semibold">สต๊อกยาง</span>
        </NavLink>

        <NavLink
          to="/admin/input"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">add_circle</span>
          <span className="text-[10px] font-semibold">บันทึก</span>
        </NavLink>

        <NavLink
          to="/admin/backup"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">cloud_sync</span>
          <span className="text-[10px] font-semibold">สำรอง</span>
        </NavLink>

      </div>
    </div>
  );
}
