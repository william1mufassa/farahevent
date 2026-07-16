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

const DIGITAL_LOGOS: Record<DigitalMethod, React.ReactNode[]> = {
  mobile_money: [
    <div key="wave" className="flex h-full w-full items-center justify-center bg-[#1dc5ff] text-white font-bold tracking-tighter gap-0.5" style={{ fontSize: '0.45rem' }}><span>🐧</span>Wave</div>,
    <div key="om" className="flex h-full w-full items-center justify-center bg-[#ff7900] text-white font-bold" style={{ fontSize: '0.5rem' }}>OM</div>,
    <div key="mtn" className="flex h-full w-full items-center justify-center bg-[#ffcc00] text-[#003366] font-bold tracking-tighter" style={{ fontSize: '0.5rem' }}>MTN</div>,
  ],
  card: [
    <div key="visa" className="flex h-full w-full items-center justify-center text-[#1a1f71] font-bold italic tracking-tighter bg-white" style={{ fontSize: '0.55rem' }}>VISA</div>,
    <div key="mc" className="flex h-full w-full items-center justify-center bg-white relative">
      <div className="absolute w-3 h-3 bg-[#eb001b] rounded-full opacity-80" style={{ left: '15%' }}></div>
      <div className="absolute w-3 h-3 bg-[#f79e1b] rounded-full opacity-80" style={{ right: '15%' }}></div>
    </div>,
  ],
};

const MANUAL_LOGOS: Record<ManualOperator, React.ReactNode[]> = {
  western_union: [
    <div key="wu" className="flex h-full w-full items-center justify-center bg-black text-[#ffcc00] font-bold tracking-tighter leading-none" style={{ fontSize: '0.55rem' }}>WU</div>
  ],
  ria: [
    <div key="ria" className="flex h-full w-full items-center justify-center bg-white text-[#f36b21] font-bold tracking-tighter" style={{ fontSize: '0.65rem' }}>ria</div>
  ],
  moneygram: [
    <div key="mg" className="flex h-full w-full items-center justify-center bg-white text-[#d6001c] font-bold italic tracking-tighter leading-none" style={{ fontSize: '0.35rem' }}>Money<br/>Gram</div>
  ],
  other: [],
};

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
                logos={DIGITAL_LOGOS[method]}
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
                logos={MANUAL_LOGOS[operator]}
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
  logos = [],
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  logos?: React.ReactNode[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-start gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition sm:flex-row sm:items-center sm:justify-between',
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
          : 'hover:bg-black/[0.03]',
      )}
      style={selected ? undefined : SOFT_BORDER}
    >
      <span>{label}</span>
      {logos.length > 0 && (
        <span className="flex items-center gap-1.5 rounded bg-white px-1.5 py-1">
          {logos.map((logo, i) => (
            <span key={i} className="flex h-5 w-7 items-center justify-center overflow-hidden rounded-sm border bg-muted/20 text-[8px] font-bold">
              {logo}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
