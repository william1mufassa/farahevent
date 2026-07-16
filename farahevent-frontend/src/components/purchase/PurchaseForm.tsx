'use client';

import { useMemo, useState } from 'react';
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
import { formatLongDate } from '@/lib/utils';
import { l } from '@/lib/localized';

import { FormulaPicker } from './FormulaPicker';
import { PersonalInfoFields } from './PersonalInfoFields';
import { PaymentPicker } from './PaymentPicker';
import { OrderRecap } from './OrderRecap';
import { TurnstileField } from './TurnstileField';
import { Ticket3DPreview } from './Ticket3DPreview';
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
  const [currentStep, setCurrentStep] = useState(1);

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
      digital_method: 'mobile_money',
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
  const firstName = form.watch('first_name') || '';
  const lastName = form.watch('last_name') || '';
  
  const selectedFormula = formulas.find((f) => f.id === formulaId) ?? null;
  const paymentLabel =
    paymentMode === 'digital'
      ? digitalMethod
        ? DIGITAL_METHOD_LABELS[digitalMethod]
        : ''
      : manualOperator
        ? MANUAL_OPERATOR_LABELS[manualOperator]
        : '';

  const nextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await form.trigger(['formula_id']);
    } else if (currentStep === 2) {
      isValid = await form.trigger([
        'first_name',
        'last_name',
        'email',
        'phone_national',
        'country',
        'city',
        'ticket_delivery_pref',
      ]);
    }
    
    if (isValid) {
      setCurrentStep(s => Math.min(s + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <FormProvider {...form}>
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <form onSubmit={onSubmit} className="space-y-10" noValidate>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary)] rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />
            {[1, 2, 3].map((step) => (
              <div 
                key={step}
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  currentStep >= step 
                    ? 'bg-[var(--color-primary)] text-white' 
                    : 'bg-zinc-800 text-zinc-500 border border-white/10'
                }`}
              >
                {step}
              </div>
            ))}
          </div>

          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              
              <div className="mt-8">
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!formulaId}
                  className="w-full rounded-md bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StepBlock index={2} title={t('step2')}>
                <PersonalInfoFields locale={locale} />
              </StepBlock>
              
              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 rounded-md border border-white/15 bg-transparent px-6 py-4 text-base font-semibold text-white transition hover:bg-white/5"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-2/3 rounded-md bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-90"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StepBlock index={3} title={t('step3')}>
                <PaymentPicker
                  digitalEnabled={digitalEnabled}
                  manualEnabled={manualEnabled}
                  paymentManual={config.payment_manual}
                  locale={locale}
                />
              </StepBlock>

              <TurnstileField locale={locale} />

              <OrderRecap
                formula={selectedFormula}
                locale={locale}
                paymentLabel={paymentLabel}
                paymentMode={paymentMode}
                digitalMethod={digitalMethod}
              />

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 rounded-md border border-white/15 bg-transparent px-6 py-4 text-base font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
                  disabled={createOrder.isPending}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={!form.formState.isValid || createOrder.isPending}
                  className="w-2/3 rounded-md bg-[var(--color-primary)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createOrder.isPending ? t('processing') : t('payCta')}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Dynamic 3D Ticket Preview Column */}
        <div className="sticky top-28 hidden lg:block space-y-6">
          <div className="text-center p-6 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 shadow-xl">
            <span className="text-xs uppercase tracking-[0.25em] opacity-60 block mb-6">Aperçu en direct de votre billet 3D</span>
            <Ticket3DPreview
              firstName={firstName}
              lastName={lastName}
              formula={selectedFormula}
              eventName={l(config.event.name, locale)}
              eventDate={formatLongDate(config.event.date, locale)}
              locale={locale}
            />
            <p className="text-[10px] text-zinc-500 mt-6 uppercase tracking-wider">Cliquez sur le billet pour retourner la carte</p>
          </div>
        </div>
      </div>
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
