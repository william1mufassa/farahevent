'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useAdminUi } from '@/stores/useAdminUi';
import { useNotifications } from '@/stores/useNotifications';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import { adminSocketUrl, getAdminNotifications } from '@/lib/api/admin/notifications';
import type { AdminWsMessage } from '@/types/admin-stats';
import { Topbar } from './shell/Topbar';
import { Sidebar } from './shell/Sidebar';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

function Shell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAdminUi((s) => s.theme);
  const setAll = useNotifications((s) => s.setAll);
  const prepend = useNotifications((s) => s.prepend);

  // Évite un mismatch d'hydratation : le thème s'applique après montage.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // `dark` posé sur <html> (pas un wrapper) pour que les portails Radix
  // (Dialog des notifications) en héritent aussi. Retiré sur le login.
  const darkMode = mounted && theme === 'dark' && pathname !== '/admin/login';
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    return () => root.classList.remove('dark');
  }, [darkMode]);

  // Garde d'auth + l'agent atterrit sur le scan (pas de dashboard).
  useEffect(() => {
    if (isLoading) return;
    if (!admin && pathname !== '/admin/login') {
      router.replace('/admin/login');
    } else if (admin?.role === 'agent' && pathname === '/admin') {
      router.replace('/admin/scan');
    }
  }, [isLoading, admin, pathname, router]);

  // Notifications : seed initial (fetch) puis push temps réel (WS, coupé en mock).
  const { data: seed } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: getAdminNotifications,
    enabled: Boolean(admin) && pathname !== '/admin/login',
  });
  useEffect(() => {
    if (seed) setAll(seed);
  }, [seed, setAll]);

  // Fabrique (identité stable) passée telle quelle : la connexion persiste
  // entre navigations admin et récupère un ticket frais à chaque (re)connexion.
  const wsEnabled = Boolean(admin) && !IS_MOCK && pathname !== '/admin/login';
  useWebSocket(wsEnabled ? adminSocketUrl : null, {
    enabled: wsEnabled,
    onMessage: (data) => {
      const msg = data as AdminWsMessage;
      if (msg?.type === 'notification') {
        prepend(msg.notification);
        if (msg.notification.urgent) {
          toast.warning(msg.notification.title, {
            description: msg.notification.body ?? undefined,
          });
        }
      }
    },
  });

  if (pathname === '/admin/login') return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!admin) return null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
