'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { useAdminUi } from '@/stores/useAdminUi';
import { navForRole } from '@/lib/admin/nav';

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

  if (!admin) return null;
  const items = navForRole(admin.role);

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-foreground">
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
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>
      </div>
    </aside>
  );
}
