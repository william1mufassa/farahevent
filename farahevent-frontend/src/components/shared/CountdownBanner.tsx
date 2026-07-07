'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface CountdownParts {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diffParts(targetMs: number, nowMs: number): CountdownParts {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Compte à rebours avant l'événement (toggle admin `show_countdown`).
 * SSR-safe : tirets avant montage, tick 1 s ensuite. Disparaît une fois
 * l'heure de début passée.
 */
export function CountdownBanner({ targetIso }: { targetIso: string }) {
  const t = useTranslations('countdown');
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return null;

  const parts = now === null ? null : diffParts(target, now);
  if (parts && parts.total <= 0) return null;

  const cells: Array<[number | null, 'days' | 'hours' | 'minutes' | 'seconds']> = [
    [parts?.days ?? null, 'days'],
    [parts?.hours ?? null, 'hours'],
    [parts?.minutes ?? null, 'minutes'],
    [parts?.seconds ?? null, 'seconds'],
  ];

  return (
    <section
      aria-label={t('label')}
      className="border-y bg-[var(--color-primary)]/5"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' }}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6">
        <p className="text-sm font-medium uppercase tracking-widest opacity-70">{t('label')}</p>
        <div className="flex items-center gap-6">
          {cells.map(([value, key]) => (
            <div key={key} className="text-center">
              <div className="min-w-[2.5ch] font-display text-3xl font-bold tabular-nums text-[var(--color-primary)]">
                {value === null ? '––' : String(value).padStart(2, '0')}
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">{t(key)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
