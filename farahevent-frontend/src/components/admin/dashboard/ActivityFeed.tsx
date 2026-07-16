'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CreditCard, QrCode, RotateCcw, X, type LucideIcon } from 'lucide-react';
import { cn, formatFCFA } from '@/lib/utils';
import type { ActivityItem, ActivityKind } from '@/types/admin-stats';

const META: Record<ActivityKind, { icon: LucideIcon; glow: string; text: string }> = {
  order_paid: { icon: Check, glow: 'bg-emerald-500/10 dark:bg-emerald-500/5', text: 'text-emerald-500' },
  manual_pending: { icon: CreditCard, glow: 'bg-amber-500/10 dark:bg-amber-500/5', text: 'text-amber-500' },
  manual_validated: { icon: Check, glow: 'bg-emerald-500/10 dark:bg-emerald-500/5', text: 'text-emerald-500' },
  manual_rejected: { icon: X, glow: 'bg-red-500/10 dark:bg-red-500/5', text: 'text-red-500' },
  scan: { icon: QrCode, glow: 'bg-blue-500/10 dark:bg-blue-500/5', text: 'text-blue-500' },
  refund: { icon: RotateCcw, glow: 'bg-slate-500/10 dark:bg-slate-500/5', text: 'text-muted-foreground' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

/** Flux d'activité récente (10 dernières, poussé par WS). */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-xl border border-white/20 bg-white/70 p-5 shadow-lg backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/70"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activité récente</h3>
      
      {items.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground italic">Aucune activité enregistrée.</p>
      ) : (
        <motion.ul
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mt-4 space-y-4"
        >
          {items.map((it) => {
            const { icon: Icon, glow, text } = META[it.kind] || { icon: Check, glow: 'bg-muted', text: 'text-muted-foreground' };
            return (
              <motion.li
                key={it.id}
                variants={itemVariants}
                className="group flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105', glow, text)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{it.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(it.at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {it.amount != null && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatFCFA(it.amount)}
                  </span>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </motion.div>
  );
}
