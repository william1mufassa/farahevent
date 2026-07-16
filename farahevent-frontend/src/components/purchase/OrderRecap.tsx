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
  paymentMode,
  digitalMethod,
}: {
  formula: FormulaConfig | null;
  locale: Locale;
  paymentLabel: string;
  paymentMode?: string;
  digitalMethod?: string;
}) {
  const t = useTranslations('purchase');
  if (!formula) return null;

  let fee = 0;
  if (paymentMode === 'digital' && digitalMethod) {
    if (digitalMethod === 'mobile_money') {
      fee = Math.ceil((formula.price + 100) / (1 - 0.035)) - formula.price;
    } else if (digitalMethod === 'card') {
      fee = Math.ceil((formula.price + 200) / (1 - 0.035)) - formula.price;
    }
  }

  const total = formula.price + fee;

  return (
    <div
      className="rounded-lg border bg-[var(--color-primary)]/5 p-4"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
    >
      <p className="text-xs font-medium uppercase tracking-widest opacity-60">{t('recap')}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>{l(formula.name, locale)}</span>
          <span>{formatFCFA(formula.price)}</span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between text-zinc-500">
            <span>Frais de transaction</span>
            <span>{formatFCFA(fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold pt-2 mt-2 border-t border-[var(--color-primary)]/20">
          <span>Total à payer</span>
          <span>{formatFCFA(total)}</span>
        </div>
        {paymentLabel && (
          <div className="text-xs text-zinc-500 mt-1">
            Moyen de paiement : {paymentLabel}
          </div>
        )}
      </div>
    </div>
  );
}
