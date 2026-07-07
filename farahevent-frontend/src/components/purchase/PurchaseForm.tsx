'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, toApiError } from '@/lib/api';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { SOFT_BORDER } from '@/lib/styles';
import { DEFAULT_COUNTRY_ISO, findCountry } from '@/lib/data/countries';
import type { EventConfig } from '@/types/event-config';
import type { OrderCreateRequest, OrderCreateResponse } from '@/types/order';

import { FormulaPicker } from './FormulaPicker';
import { PersonalInfoFields } from './PersonalInfoFields';
import { PaymentPicker } from './PaymentPicker';
import { OrderRecap } from './OrderRecap';
import { TurnstileField } from './TurnstileField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  assembleWhatsapp,
  buildPurchaseSchema,
  CAPTCHA_REQUIRED,
  DIGITAL_METHOD_LABELS,
  MANUAL_OPERATOR_LABELS,
  type PurchaseFormData,
} from './schema';

export type PurchaseChannel = 'presentiel' | 'online';

/**
 * Tunnel d'achat (CDC §4.1/4.2) : formulaire 3 étapes visibles simultanément,
 * validation temps réel, récap live, CAPTCHA, CTA désactivé tant qu'incomplet.
 * - digital → redirection vers l'URL de checkout du provider (PayDunya)
 * - manuel  → écran d'instructions + preuve (/paiement/manuel)
 */
export function PurchaseForm({
  config,
  channel,
  locale,
}: {
  config: EventConfig;
  channel: PurchaseChannel;
  locale: Locale;
}) {
  const t = useTranslations('purchase');
  const router = useRouter();
  const searchParams = useSearchParams();

  const formulas = useMemo(
    () =>
      config.formulas
        .filter((f) => f.channel === channel || f.channel === 'both')
        .sort((a, b) => a.sort_order - b.sort_order),
    [config.formulas, channel],
  );

  const digitalEnabled = config.options.digital_enabled;
  const manualEnabled = config.options.manual_enabled;

  const schema = useMemo(
    () =>
      buildPurchaseSchema(
        {
          required: t('errors.required'),
          email: t('errors.email'),
          phone: t('errors.phone'),
          captcha: t('errors.captcha'),
        },
        CAPTCHA_REQUIRED,
      ),
    [t],
  );

  const requestedFormula = searchParams.get('formula');
  const defaultFormula =
    formulas.find((f) => f.id === requestedFormula && !f.is_sold_out) ??
    formulas.find((f) => !f.is_sold_out) ??
    formulas[0];

  const defaultCountry = findCountry(DEFAULT_COUNTRY_ISO);
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(schema),
    // CDC : validation temps réel + CTA désactivé tant que le formulaire est incomplet
    mode: 'onChange',
    defaultValues: {
      formula_id: defaultFormula?.id ?? '',
      first_name: '',
      last_name: '',
      email: '',
      dial_iso: DEFAULT_COUNTRY_ISO,
      phone_national: '',
      country: defaultCountry ? (locale === 'en' ? defaultCountry.en : defaultCountry.fr) : '',
      city: '',
      ticket_delivery_pref: 'both',
      payment_mode: digitalEnabled ? 'digital' : 'manual',
      digital_method: 'wave',
      manual_operator: 'western_union',
      turnstile_token: '',
    },
  });

  const createOrder = useMutation({
    mutationFn: async (payload: OrderCreateRequest) =>
      (await api.post<OrderCreateResponse>('/orders/', payload)).data,
    onSuccess: (order, variables) => {
      if (order.payment_mode === 'digital' && order.checkout_url) {
        window.location.href = order.checkout_url;
        return;
      }
      if (order.payment_mode === 'manual') {
        const operator = variables.payment_method_label ?? 'western_union';
        router.push(
          `/paiement/manuel?order_id=${order.order_id}&e=${config.event.slug}&op=${operator}`,
        );
        return;
      }
      router.push(`/en-attente?order_id=${order.order_id}&e=${config.event.slug}`);
    },
    onError: (err) => {
      const apiError = toApiError(err);
      toast.error(apiError.status === 429 ? t('errors.rateLimit') : apiError.message);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createOrder.mutate({
      event_id: config.event.id,
      formula_id: values.formula_id,
      participant: {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        whatsapp: assembleWhatsapp(values.dial_iso, values.phone_national),
        country: values.country,
        city: values.city || null,
        ticket_delivery_pref: values.ticket_delivery_pref,
      },
      payment_mode: values.payment_mode,
      payment_method_label:
        values.payment_mode === 'digital' ? values.digital_method : values.manual_operator,
      turnstile_token: values.turnstile_token || null,
    });
  });

  // Récap temps réel
  const formulaId = form.watch('formula_id');
  const paymentMode = form.watch('payment_mode');
  const digitalMethod = form.watch('digital_method');
  const manualOperator = form.watch('manual_operator');
  const selectedFormula = formulas.find((f) => f.id === formulaId) ?? null;
  const paymentLabel =
    paymentMode === 'digital'
      ? digitalMethod
        ? DIGITAL_METHOD_LABELS[digitalMethod]
        : ''
      : manualOperator
        ? MANUAL_OPERATOR_LABELS[manualOperator]
        : '';

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-10" noValidate>
        <StepBlock index={1} title={t('step1')}>
          <FormulaPicker
            formulas={formulas}
            locale={locale}
            showCounter={config.options.show_tickets_counter}
          />
          {channel === 'online' && (
            <Alert variant="info" className="mt-4">
              <AlertDescription>{t('onlineNotice')}</AlertDescription>
            </Alert>
          )}
        </StepBlock>

        <StepBlock index={2} title={t('step2')}>
          <PersonalInfoFields locale={locale} />
        </StepBlock>

        <StepBlock index={3} title={t('step3')}>
          <PaymentPicker
            digitalEnabled={digitalEnabled}
            manualEnabled={manualEnabled}
            paymentManual={config.payment_manual}
            locale={locale}
          />
        </StepBlock>

        <TurnstileField locale={locale} />

        <OrderRecap formula={selectedFormula} locale={locale} paymentLabel={paymentLabel} />

        <button
          type="submit"
          disabled={!form.formState.isValid || createOrder.isPending}
          className="w-full rounded-md bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createOrder.isPending ? t('processing') : t('payCta')}
        </button>
      </form>
    </FormProvider>
  );
}

function StepBlock({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
          {index}
        </span>
        {title}
      </h2>
      <div className="rounded-lg border p-5 sm:p-6" style={SOFT_BORDER}>
        {children}
      </div>
    </section>
  );
}
