import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * « X places restantes » sous le prix d'une formule (toggle admin
 * `show_tickets_counter`). Rendu côté serveur ou client indifféremment.
 */
export function TicketsCounter({
  remaining,
  className,
}: {
  remaining: number | null;
  className?: string;
}) {
  const t = useTranslations('tickets');
  if (remaining === null || remaining < 0) return null;
  return (
    <p className={cn('text-xs font-semibold text-[var(--color-primary)]', className)}>
      {t('remaining', { count: remaining })}
    </p>
  );
}
