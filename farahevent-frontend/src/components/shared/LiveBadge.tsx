import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/** Badge « EN DIRECT » rouge clignotant (navbar quand l'événement est live). */
export function LiveBadge({ className }: { className?: string }) {
  const t = useTranslations('live');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-500',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      {t('badge')}
    </span>
  );
}
