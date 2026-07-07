'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, toApiError } from '@/lib/api';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';
import { SOFT_BORDER } from '@/lib/styles';
import { formatFCFA } from '@/lib/utils';
import type { PaymentManualConfig } from '@/types/event-config';
import type { OrderPublicStatus } from '@/types/order';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCombobox } from './CountrySelect';
import { ReceiptUpload } from './ReceiptUpload';
import {
  MANUAL_OPERATORS,
  MANUAL_OPERATOR_LABELS,
  type ManualOperator,
} from './schema';

/**
 * Écran preuve de paiement manuel (CDC §4.3) : instructions de transfert
 * (bénéficiaire, montant FCFA + équivalents devises) puis formulaire
 * nom exact / pays d'envoi / photo du reçu → /en-attente.
 * URL résumable : l'acheteur peut revenir après avoir fait son transfert.
 */
export function ManualProofForm({
  orderId,
  slug,
  initialOperator,
  paymentManual,
  locale,
}: {
  orderId: string;
  slug: string | null;
  initialOperator: ManualOperator;
  paymentManual: PaymentManualConfig | null;
  locale: Locale;
}) {
  const t = useTranslations('manualProof');
  const router = useRouter();

  const [operator, setOperator] = useState<ManualOperator>(initialOperator);
  const [senderName, setSenderName] = useState('');
  const [senderCountry, setSenderCountry] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t('fileHint'));
      const fd = new FormData();
      fd.append('operator', operator);
      fd.append('sender_name', senderName.trim());
      fd.append('sender_country', senderCountry);
      fd.append('receipt', file);
      return (
        await api.post(`/orders/${orderId}/manual-payment`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      toast.success(t('submitted'));
      const suffix = slug ? `&e=${slug}` : '';
      router.push(`/en-attente?order_id=${orderId}${suffix}`);
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  // Statuts terminaux : plus de soumission possible
  if (order && ['PAID', 'MANUAL_VALIDATED'].includes(order.status)) {
    return (
      <Alert variant="info">
        <AlertDescription>
          {t('alreadyValidated')}{' '}
          <Link href={`/confirmation?order_id=${orderId}`} className="font-medium underline">
            {t('seeStatus')}
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const beneficiaryRows: Array<[string, string | null]> = [
    [t('operator'), MANUAL_OPERATOR_LABELS[operator]],
    [t('beneficiary'), paymentManual?.beneficiary_name ?? null],
    [t('country'), paymentManual?.beneficiary_country ?? null],
    [t('city'), paymentManual?.beneficiary_city ?? null],
  ];

  const canSubmit = senderName.trim().length > 0 && senderCountry.length > 1 && file !== null;

  return (
    <div className="space-y-8">
      {/* ── Instructions de transfert ── */}
      <section className="rounded-lg border p-5 sm:p-6" style={SOFT_BORDER}>
        <h2 className="mb-4 text-lg font-semibold">{t('title')}</h2>
        <dl className="space-y-2 text-sm">
          {beneficiaryRows.map(
            ([label, value]) =>
              value && (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="opacity-60">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ),
          )}
          <div className="flex justify-between gap-4 border-t pt-2" style={SOFT_BORDER}>
            <dt className="opacity-60">{t('amount')}</dt>
            <dd className="text-right font-semibold">
              {order ? formatFCFA(order.amount) : '—'}
              {paymentManual?.amount_eur && paymentManual?.amount_usd && (
                <span className="block text-xs font-normal opacity-60">
                  {t('approx', {
                    eur: paymentManual.amount_eur,
                    usd: paymentManual.amount_usd,
                  })}
                </span>
              )}
            </dd>
          </div>
        </dl>
        {paymentManual?.instructions && (
          <p className="mt-4 text-sm leading-relaxed opacity-75">
            {l(paymentManual.instructions, locale)}
          </p>
        )}
      </section>

      {order?.status === 'MANUAL_PENDING' && (
        <Alert variant="info">
          <AlertDescription>{t('alreadySubmitted')}</AlertDescription>
        </Alert>
      )}

      {/* ── Preuve ── */}
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <p className="font-medium">{t('afterTransfer')}</p>

        <div className="space-y-2">
          <Label>{t('operator')}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {MANUAL_OPERATORS.map((op) => (
              <button
                type="button"
                key={op}
                onClick={() => setOperator(op)}
                aria-pressed={operator === op}
                className={
                  operator === op
                    ? 'rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2.5 text-left text-sm font-medium'
                    : 'rounded-md border px-3 py-2.5 text-left text-sm font-medium transition hover:bg-black/[0.03]'
                }
                style={operator === op ? undefined : SOFT_BORDER}
              >
                {MANUAL_OPERATOR_LABELS[op]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sender_name">{t('senderName')}</Label>
          <Input
            id="sender_name"
            required
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sender_country">{t('senderCountry')}</Label>
          <CountryCombobox
            id="sender_country"
            value={senderCountry}
            onChange={setSenderCountry}
            locale={locale}
            placeholder={t('senderCountry')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('receipt')}</Label>
          <ReceiptUpload file={file} onChange={setFile} />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submit.isPending}
          className="w-full rounded-md bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submit.isPending ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  );
}
