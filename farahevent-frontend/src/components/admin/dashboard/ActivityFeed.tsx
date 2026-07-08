'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CreditCard, QrCode, RotateCcw, X, type LucideIcon } from 'lucide-react';
import { cn, formatFCFA } from '@/lib/utils';
import type { ActivityItem, ActivityKind } from '@/types/admin-stats';

const META: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  order_paid: { icon: Check, className: 'text-emerald-500' },
  manual_pending: { icon: CreditCard, className: 'text-amber-500' },
  manual_validated: { icon: Check, className: 'text-emerald-500' },
  manual_rejected: { icon: X, className: 'text-red-500' },
  scan: { icon: QrCode, className: 'text-blue-500' },
  refund: { icon: RotateCcw, className: 'text-muted-foreground' },
};

/** Flux d'activité récente (10 dernières, poussé par WS). */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Activité récente</h3>
      <ul className="mt-3 divide-y divide-border">
        {items.map((it) => {
          const { icon: Icon, className } = META[it.kind];
          return (
            <li key={it.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted',
                  className,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{it.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(it.at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              {it.amount != null && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatFCFA(it.amount)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
