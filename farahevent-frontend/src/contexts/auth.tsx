'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminInfo, AdminRole } from '@/types/admin';
import { mockAdmin } from '@/mocks/admin.fixture';

/**
 * Contexte auth admin. Les jetons vivent en cookies httpOnly posés par le
 * BFF (/api/admin-session/*) — jamais côté JS (audit §07). Le client ne
 * conserve que le profil (non sensible) pour l'affichage ; l'API reste
 * l'autorité à chaque requête via le proxy.
 */
interface AuthCtx {
  admin: AdminInfo | null;
  isLoading: boolean;
  login: (admin: AdminInfo) => void;
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
    // Dev sans backend : admin fictif ; ?role= pour prévisualiser les 4 rôles.
    if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
      const roles: AdminRole[] = ['super_admin', 'manager', 'agent', 'comptable'];
      const param = new URLSearchParams(window.location.search).get('role');
      const stored = localStorage.getItem('fe_admin');
      if (roles.includes(param as AdminRole)) {
        setAdmin(mockAdmin(param as AdminRole));
      } else if (stored) {
        try {
          setAdmin(JSON.parse(stored));
        } catch {
          setAdmin(mockAdmin('super_admin'));
        }
      } else {
        setAdmin(mockAdmin('super_admin'));
      }
      setIsLoading(false);
      return;
    }

    // Profil d'affichage uniquement — la session réelle est le cookie httpOnly.
    const stored = localStorage.getItem('fe_admin');
    if (stored) {
      try {
        setAdmin(JSON.parse(stored));
      } catch {
        localStorage.removeItem('fe_admin');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((adminData: AdminInfo) => {
    localStorage.setItem('fe_admin', JSON.stringify(adminData));
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    // Efface les cookies httpOnly côté serveur, puis purge le profil local.
    fetch('/api/admin-session/logout', { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        localStorage.removeItem('fe_admin');
        setAdmin(null);
        router.push('/admin/login');
      });
  }, [router]);

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
