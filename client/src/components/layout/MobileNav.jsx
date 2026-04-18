import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function MobileNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mobile-nav glass border-t border-border-light">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        <NavLink
          to="/tech/input"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
          <span className="text-[10px] font-semibold">บันทึก</span>
        </NavLink>

        <NavLink
          to="/tech/recent"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">history</span>
          <span className="text-[10px] font-semibold">ล่าสุด</span>
        </NavLink>

        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-text-muted"
        >
          <span className="material-symbols-outlined text-2xl">logout</span>
          <span className="text-[10px] font-semibold">ออก</span>
        </button>
      </div>
    </div>
  );
}
