'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { useAdminUi } from '@/stores/useAdminUi';
import { navForRole } from '@/lib/admin/nav';
import { useEffect } from 'react';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  manager: 'Manager',
  comptable: 'Comptable',
  agent: 'Agent',
};

/**
 * Sidebar admin (CONCEPTION_FRONTEND.md §10.1) : rétractable (icônes seules
 * en mode replié), sections filtrées par rôle. Garde double avec l'API.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const collapsed = useAdminUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useAdminUi((s) => s.toggleSidebar);

  // Auto-close sur mobile après navigation
  useEffect(() => {
    if (window.innerWidth < 768 && !collapsed) {
      toggleSidebar();
    }
  }, [pathname]);

  if (!admin) return null;
  const items = navForRole(admin.role);

  return (
    <aside
      className={cn(
        'absolute inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col border-r border-white/20 bg-white/30 backdrop-blur-md transition-all duration-300 dark:border-slate-800/40 dark:bg-[#070b13]/30',
        // Desktop : relative, collapsed = width 16 (icones), sinon 64
        'md:relative md:translate-x-0',
        collapsed ? 'md:w-16 w-64 -translate-x-full' : 'w-64 translate-x-0',
      )}
    >
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 group',
                collapsed && 'justify-center px-0',
                active
                  ? 'text-white dark:text-white'
                  : 'text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5',
              )}
            >
              {active && (
                <motion.div
                  layoutId="active-sidebar-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/15"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={cn('relative z-10 transition-colors', active && 'text-white')}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </motion.div>

              {!collapsed && (
                <span className={cn('relative z-10 truncate transition-colors', active && 'text-white')}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/20 p-3 dark:border-slate-800/40">
        {!collapsed && (
          <div className="mb-3 px-1">
            <p className="truncate text-sm font-bold text-foreground">
              {admin.first_name} {admin.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[admin.role] ?? admin.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-0',
          )}
        >
          <motion.div whileHover={{ rotate: 15 }}>
            <LogOut className="h-5 w-5 shrink-0" />
          </motion.div>
          {!collapsed && 'Déconnexion'}
        </button>
      </div>
    </aside>
  );
}
