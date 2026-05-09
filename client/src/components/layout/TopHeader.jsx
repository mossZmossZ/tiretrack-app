import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-border-light flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xl select-none">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาทะเบียน, รุ่นรถ..."
            className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl text-sm border border-border-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Profile dropdown */}
      <div className="ml-auto relative" ref={ref}>
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shadow-primary/25">
            <span
              className="material-symbols-outlined text-white text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              manage_accounts
            </span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-text-primary leading-none">ผู้ดูแลระบบ</p>
            <p className="text-xs text-text-muted mt-0.5 capitalize">{user?.role || 'Admin'}</p>
          </div>
          <span className="material-symbols-outlined text-text-muted text-lg hidden sm:block">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-2xl shadow-lg border border-border-light py-2 animate-slide-down z-50">
            <div className="px-4 py-2.5 border-b border-border-light">
              <p className="text-sm font-semibold text-text-primary">ผู้ดูแลระบบ</p>
              <p className="text-xs text-text-muted capitalize">{user?.role || 'Admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 mt-1 text-sm font-medium text-danger hover:bg-danger-bg transition-colors rounded-b-2xl"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
