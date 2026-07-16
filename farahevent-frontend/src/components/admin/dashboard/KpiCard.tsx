'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: 'warning' | 'live';
}) {
  // Glow background reflecting the accent or default color
  const glowClass = 
    accent === 'warning'
      ? 'bg-amber-500/10 dark:bg-amber-500/5 group-hover:bg-amber-500/20'
      : accent === 'live'
        ? 'bg-red-500/10 dark:bg-red-500/5 group-hover:bg-red-500/20'
        : 'bg-primary/10 dark:bg-primary/5 group-hover:bg-primary/15';

  const textAccent = 
    accent === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : accent === 'live'
        ? 'text-red-600 dark:text-red-400'
        : 'text-primary';

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/20 bg-white/70 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl dark:border-slate-800/40 dark:bg-slate-900/70',
        accent === 'warning'
          ? 'border-amber-500/20 hover:border-amber-500/40 shadow-amber-500/5'
          : accent === 'live'
            ? 'border-red-500/20 hover:border-red-500/40 shadow-red-500/5'
            : 'hover:border-primary/30 hover:shadow-primary/5'
      )}
    >
      {/* Decorative backdrop glow */}
      <div className={cn('absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-colors duration-500', glowClass)} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn('rounded-lg p-2 transition-transform duration-300 group-hover:scale-110', glowClass, textAccent)}>
          <Icon className={cn('h-4 w-4', accent === 'live' && 'animate-pulse')} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{value}</p>
        {sub && (
          <p className={cn('mt-1.5 text-xs font-medium', accent === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}
