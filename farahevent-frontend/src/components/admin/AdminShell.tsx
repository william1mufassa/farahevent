'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
  const collapsed = useAdminUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useAdminUi((s) => s.toggleSidebar);
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-foreground dark:bg-[#070b13] transition-colors duration-500">
      {/* Background Liquid Light Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-600/5" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-cyan-500/10 blur-[130px] dark:bg-cyan-600/5 animate-pulse duration-[8s]" />
        <div className="absolute left-[30%] top-[40%] h-[30%] w-[30%] rounded-full bg-purple-500/10 blur-[110px] dark:bg-purple-600/5" />
      </div>

      <Topbar />
      
      <div className="relative flex flex-1 overflow-hidden z-10">
        {/* Mobile backdrop */}
        {!collapsed && (
          <div 
            className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={toggleSidebar}
          />
        )}
        <Sidebar />
        
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent"
          >
            {children}
          </motion.main>
        </AnimatePresence>
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
