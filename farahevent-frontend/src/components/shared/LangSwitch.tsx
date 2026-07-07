'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Switch FR | EN (CDC §3.3). Bascule le préfixe d'URL via le routing next-intl ;
 * le cookie de préférence est persisté par le middleware. Query string conservée.
 */
export function LangSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(next: Locale) {
    if (next === locale) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', className)}>
      <LangButton active={locale === 'fr'} onClick={() => switchTo('fr')} label="FR" />
      <span aria-hidden className="opacity-40">
        |
      </span>
      <LangButton active={locale === 'en'} onClick={() => switchTo('en')} label="EN" />
    </div>
  );
}

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'font-medium transition',
        active ? 'font-bold underline underline-offset-4' : 'opacity-60 hover:opacity-100',
      )}
    >
      {label}
    </button>
  );
}
