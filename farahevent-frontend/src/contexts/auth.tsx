'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminInfo } from '@/types/admin';

interface AuthCtx {
  admin: AdminInfo | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, admin: AdminInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  admin: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('fe_admin');
    const token = localStorage.getItem('fe_access_token');
    if (stored && token) {
      try {
        setAdmin(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    (accessToken: string, refreshToken: string, adminData: AdminInfo) => {
      localStorage.setItem('fe_access_token', accessToken);
      localStorage.setItem('fe_refresh_token', refreshToken);
      localStorage.setItem('fe_admin', JSON.stringify(adminData));
      setAdmin(adminData);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('fe_access_token');
    localStorage.removeItem('fe_refresh_token');
    localStorage.removeItem('fe_admin');
    setAdmin(null);
    router.push('/admin/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
