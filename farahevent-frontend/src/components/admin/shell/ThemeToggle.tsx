'use client';

import { Moon, Sun } from 'lucide-react';
import { useAdminUi } from '@/stores/useAdminUi';

/** Bascule clair/sombre du dashboard admin (persistée via le store). */
export function ThemeToggle() {
  const theme = useAdminUi((s) => s.theme);
  const toggleTheme = useAdminUi((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en clair' : 'Passer en sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
