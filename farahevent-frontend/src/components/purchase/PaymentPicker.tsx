'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOFT_BORDER } from '@/lib/styles';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';
import type { PaymentManualConfig } from '@/types/event-config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldError } from './FieldError';
import {
  DIGITAL_METHODS,
  DIGITAL_METHOD_LABELS,
  MANUAL_OPERATORS,
  MANUAL_OPERATOR_LABELS,
  type DigitalMethod,
  type ManualOperator,
  type PurchaseFormData,
} from './schema';

/**
 * Étape 3 — choix du paiement (CDC §4.1) : deux sections visuellement
 * séparées (digital / manuel). Sélectionner un moyen dans une section
 * sélectionne le mode correspondant. Une section désactivée dans l'admin
 * n'apparaît pas du tout.
 */
export function PaymentPicker({
  digitalEnabled,
  manualEnabled,
  paymentManual,
  locale,
}: {
  digitalEnabled: boolean;
  manualEnabled: boolean;
  paymentManual: PaymentManualConfig | null;
  locale: Locale;
}) {
  const t = useTranslations('purchase');
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PurchaseFormData>();

  const mode = watch('payment_mode');
  const digitalMethod = watch('digital_method');
  const manualOperator = watch('manual_operator');

  const pickDigital = (method: DigitalMethod) => {
    setValue('payment_mode', 'digital', { shouldValidate: true });
    setValue('digital_method', method, { shouldValidate: true });
  };
  const pickManual = (operator: ManualOperator) => {
    setValue('payment_mode', 'manual', { shouldValidate: true });
    setValue('manual_operator', operator, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      {digitalEnabled && (
        <PaymentGroup
          icon={<CreditCard className="h-5 w-5" />}
          title={t('digitalTitle')}
          subtitle={t('digitalSubtitle')}
          active={mode === 'digital'}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {DIGITAL_METHODS.map((method) => (
              <MethodButton
                key={method}
                label={DIGITAL_METHOD_LABELS[method]}
                selected={mode === 'digital' && digitalMethod === method}
                onClick={() => pickDigital(method)}
              />
            ))}
          </div>
          {mode === 'digital' && <FieldError message={errors.digital_method?.message} />}
        </PaymentGroup>
      )}

      {manualEnabled && (
        <PaymentGroup
          icon={<Landmark className="h-5 w-5" />}
          title={t('manualTitle')}
          subtitle={t('manualSubtitle')}
          active={mode === 'manual'}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {MANUAL_OPERATORS.map((operator) => (
              <MethodButton
                key={operator}
                label={MANUAL_OPERATOR_LABELS[operator]}
                selected={mode === 'manual' && manualOperator === operator}
                onClick={() => pickManual(operator)}
              />
            ))}
          </div>
          {mode === 'manual' && <FieldError message={errors.manual_operator?.message} />}

          {mode === 'manual' && paymentManual?.beneficiary_name && (
            <Alert variant="info" className="mt-3">
              <AlertDescription>
                {t('manualHint', {
                  beneficiary: [
                    paymentManual.beneficiary_name,
                    paymentManual.beneficiary_city,
                    paymentManual.beneficiary_country,
                  ]
                    .filter(Boolean)
                    .join(', '),
                })}
                {paymentManual.instructions && (
                  <> {l(paymentManual.instructions, locale)}</>
                )}
              </AlertDescription>
            </Alert>
          )}
        </PaymentGroup>
      )}
    </div>
  );
}

function PaymentGroup({
  icon,
  title,
  subtitle,
  active,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        'rounded-lg border-2 p-4 transition sm:p-5',
        active && 'border-[var(--color-primary)]/60',
      )}
      style={active ? undefined : SOFT_BORDER}
    >
      <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
        <span className="text-[var(--color-primary)]">{icon}</span>
        {title}
      </legend>
      <p className="mb-3 text-xs opacity-60">{subtitle}</p>
      {children}
    </fieldset>
  );
}

function MethodButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-md border px-3 py-2.5 text-left text-sm font-medium transition',
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
          : 'hover:bg-black/[0.03]',
      )}
      style={selected ? undefined : SOFT_BORDER}
    >
      {label}
    </button>
  );
}
