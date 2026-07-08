import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Carte KPI (CONCEPTION_FRONTEND.md §10.2). `accent="warning"` (orange) pour
 * les paiements manuels en attente ; `live` pour le compteur viewers.
 */
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
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm',
        accent === 'warning' && 'border-amber-500/40',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            'h-4 w-4',
            accent === 'warning'
              ? 'text-amber-500'
              : accent === 'live'
                ? 'text-red-500'
                : 'text-muted-foreground',
          )}
        />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub && (
        <p
          className={cn(
            'mt-1 text-xs',
            accent === 'warning' ? 'font-medium text-amber-600' : 'text-muted-foreground',
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
