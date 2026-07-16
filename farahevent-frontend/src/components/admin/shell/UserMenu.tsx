'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  manager: 'Manager',
  comptable: 'Comptable',
  agent: 'Agent',
};

/** Avatar + menu (topbar) — infos compte, sécurité, déconnexion. */
export function UserMenu() {
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!admin) return null;
  const initials = `${admin.first_name[0] ?? ''}${admin.last_name[0] ?? ''}`.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 rounded-xl p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm shadow-indigo-500/20">
          {initials}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-white/20 bg-white/70 text-foreground shadow-2xl backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/70"
          >
            <div className="border-b border-border/40 px-4 py-3">
              <p className="truncate text-sm font-bold">
                {admin.first_name} {admin.last_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{ROLE_LABEL[admin.role] ?? admin.role}</p>
            </div>
            <div className="p-1.5 space-y-1">
              <Link
                href="/admin/2fa"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
                Sécurité (2FA)
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4.5 w-4.5" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
