'use client';

import { useTranslations } from 'next-intl';
import { l } from '@/lib/localized';
import { formatFCFA } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/routing';
import type { FormulaConfig } from '@/types/event-config';

/** Récapitulatif temps réel : « Standard — 35 000 FCFA — Orange Money ». */
export function OrderRecap({
  formula,
  locale,
  paymentLabel,
}: {
  formula: FormulaConfig | null;
  locale: Locale;
  paymentLabel: string;
}) {
  const t = useTranslations('purchase');
  if (!formula) return null;

  return (
    <div
      className="rounded-lg border bg-[var(--color-primary)]/5 p-4"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
    >
      <p className="text-xs font-medium uppercase tracking-widest opacity-60">{t('recap')}</p>
      <p className="mt-1 font-semibold">
        {l(formula.name, locale)} — {formatFCFA(formula.price)}
        {paymentLabel && <> — {paymentLabel}</>}
      </p>
    </div>
  );
}
