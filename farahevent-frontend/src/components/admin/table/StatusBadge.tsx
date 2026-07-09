import { cn } from '@/lib/utils';

/** Pastille de statut — participants (payé/en attente/…) + paiements manuels. */
const MAP: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Payé', cls: 'bg-emerald-500/15 text-emerald-600' },
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-600' },
  failed: { label: 'Échoué', cls: 'bg-red-500/15 text-red-600' },
  refunded: { label: 'Remboursé', cls: 'bg-muted text-muted-foreground' },
  validated: { label: 'Validé', cls: 'bg-emerald-500/15 text-emerald-600' },
  rejected: { label: 'Rejeté', cls: 'bg-red-500/15 text-red-600' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', s.cls)}>
      {s.label}
    </span>
  );
}
