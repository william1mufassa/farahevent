'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { TicketsCounter } from '@/components/shared/TicketsCounter';
import { l } from '@/lib/localized';
import { cn, formatFCFA } from '@/lib/utils';
import { SOFT_BORDER } from '@/lib/styles';
import type { Locale } from '@/lib/i18n/routing';
import type { FormulaConfig } from '@/types/event-config';
import { FieldError } from './FieldError';
import type { PurchaseFormData } from './schema';

/**
 * Étape 1 — cartes radio des formules (CDC §4.1). Sur /acheter/en-ligne
 * avec une seule formule, la carte est présélectionnée sans interaction.
 */
export function FormulaPicker({
  formulas,
  locale,
  showCounter,
}: {
  formulas: FormulaConfig[];
  locale: Locale;
  showCounter: boolean;
}) {
  const t = useTranslations('purchase');
  const { control } = useFormContext<PurchaseFormData>();

  return (
    <Controller
      name="formula_id"
      control={control}
      render={({ field, fieldState }) => (
        <>
          <div
            role="radiogroup"
            className={cn('grid gap-4', formulas.length > 1 && 'sm:grid-cols-2')}
          >
            {formulas.map((formula) => {
              const selected = field.value === formula.id;
              return (
                <button
                  key={formula.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={formula.is_sold_out}
                  onClick={() => field.onChange(formula.id)}
                  className={cn(
                    'relative flex h-full flex-col rounded-lg border-2 p-5 text-left transition',
                    selected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'hover:bg-black/[0.02]',
                    formula.is_sold_out && 'cursor-not-allowed opacity-50',
                  )}
                  style={selected ? undefined : SOFT_BORDER}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                      selected ? 'border-[var(--color-primary)]' : 'border-current opacity-30',
                    )}
                  >
                    {selected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </span>

                  {formula.is_sold_out && (
                    <span className="absolute right-4 top-4 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {t('soldOut')}
                    </span>
                  )}

                  <span className="pr-8 font-semibold">{l(formula.name, locale)}</span>
                  <span className="mt-2 text-2xl font-bold">{formatFCFA(formula.price)}</span>
                  {showCounter && !formula.is_sold_out && (
                    <TicketsCounter remaining={formula.remaining} className="mt-1" />
                  )}
                  <ul className="mt-3 space-y-1.5 text-sm opacity-80">
                    {formula.advantages.map((advantage, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-[var(--color-primary)]">
                          •
                        </span>
                        {l(advantage, locale)}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <FieldError message={fieldState.error?.message} />
        </>
      )}
    />
  );
}
