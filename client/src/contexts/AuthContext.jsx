import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { role: 'admin' | 'tech' }
  const [token, setToken] = useState(() => localStorage.getItem('tiretrack_token'));
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => {
          if (res.success) {
            setUser({ role: res.data.role });
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (pin) => {
    const res = await api.post('/auth/login', { pin });
    if (res.success) {
      const { token: newToken, role } = res.data;
      localStorage.setItem('tiretrack_token', newToken);
      setToken(newToken);
      setUser({ role });
      return { success: true, role };
    }
    return { success: false, error: res.error };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tiretrack_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
