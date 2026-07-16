'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useAdminUi } from '@/stores/useAdminUi';

/** Bascule clair/sombre du dashboard admin (persistée via le store). */
export function ThemeToggle() {
  const theme = useAdminUi((s) => s.theme);
  const toggleTheme = useAdminUi((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? 'Passer en clair' : 'Passer en sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -10, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 10, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-amber-500 animate-pulse" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-600" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
