import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import MobileNav from './components/layout/MobileNav.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ServiceLog from './pages/admin/ServiceLog.jsx';
import ImportExport from './pages/admin/ImportExport.jsx';
import QuickInput from './pages/tech/QuickInput.jsx';
import RecentEntries from './pages/tech/RecentEntries.jsx';

function ProtectedRoute({ allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/tech/input'} replace />;
  }

  return <Outlet />;
}

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}

function TechLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Outlet />
      <MobileNav />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>tire_repair</span>
          </div>
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/tech/input'} replace /> : <LoginPage />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/services" element={<ServiceLog />} />
          <Route path="/admin/import" element={<ImportExport />} />
        </Route>
      </Route>

      {/* Tech routes */}
      <Route element={<ProtectedRoute allowedRole="tech" />}>
        <Route element={<TechLayout />}>
          <Route path="/tech/input" element={<QuickInput />} />
          <Route path="/tech/recent" element={<RecentEntries />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
