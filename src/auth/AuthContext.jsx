import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);
  // Cached queries belong to whoever was logged in — drop them on every login/logout so one
  // partner's menus/dashboard never flash up for the next account in the same tab.
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('pms_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('pms_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('pms_token', data.token);
    localStorage.setItem('pms_user', JSON.stringify(data.user));
    queryClient.clear();
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('pms_token');
    localStorage.removeItem('pms_user');
    queryClient.clear();
    setUser(null);
  };

  const can = (permission) => user?.permissions?.includes(permission) ?? false;
  const hasRole = (role) => user?.roles?.includes(role) ?? false;

  const value = useMemo(
    () => ({ user, loading, login, logout, can, hasRole, isPartnerUser: !!user?.is_partner_user }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
