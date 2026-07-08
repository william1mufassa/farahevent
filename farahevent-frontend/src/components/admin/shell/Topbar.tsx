'use client';

import { PanelLeft } from 'lucide-react';
import { useAdminUi } from '@/stores/useAdminUi';
import { EventSelector } from './EventSelector';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/** Topbar admin (CONCEPTION_FRONTEND.md §10.1). */
export function Topbar() {
  const toggleSidebar = useAdminUi((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Replier le menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PanelLeft className="h-5 w-5" />
      </button>
      <span className="font-display text-sm font-bold tracking-tight">
        FarahEvent <span className="font-normal text-muted-foreground">Admin</span>
      </span>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <EventSelector />
        <NotificationCenter />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
