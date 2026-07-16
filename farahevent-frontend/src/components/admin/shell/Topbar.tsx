'use client';

import { motion } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { useAdminUi } from '@/stores/useAdminUi';
import { EventSelector } from './EventSelector';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/** Topbar admin (CONCEPTION_FRONTEND.md §10.1). */
export function Topbar() {
  const toggleSidebar = useAdminUi((s) => s.toggleSidebar);
  const collapsed = useAdminUi((s) => s.sidebarCollapsed);

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-white/20 bg-white/60 px-3 shadow-sm backdrop-blur-md sm:gap-3 sm:px-4 dark:border-slate-800/40 dark:bg-[#070b13]/60">
      <motion.button
        type="button"
        onClick={toggleSidebar}
        aria-label="Replier le menu"
        whileTap={{ scale: 0.95 }}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <PanelLeft className="h-5 w-5" />
        </motion.div>
      </motion.button>
      
      <span className="hidden sm:inline font-display text-sm font-extrabold tracking-tight">
        Farah<span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">Event</span> <span className="font-light text-muted-foreground">Admin</span>
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
