'use client';

import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { api, toApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/utils';
import { useRouter } from '@/lib/i18n/navigation';
import type { EventDetailPublic, FormulaPublic } from '@/types/event';
import type { OrderCreateRequest, OrderCreateResponse, PaymentMode } from '@/types/order';

import { ThemeWrapper } from '@/components/theme/ThemeWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Tunnel d'achat provisoire. Remplacé au Lot 3 par les pages dédiées
 * /acheter/presentiel et /acheter/en-ligne (formulaire 3 étapes, Turnstile).
 */
const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  whatsapp: z
    .string()
    .regex(/^\+?\d{8,15}$/, 'Format international attendu (ex : +2250700000000)'),
  country: z.string().min(2, 'Pays requis'),
  city: z.string().optional(),
  ticket_delivery_pref: z.enum(['email', 'whatsapp', 'both']),
});

type FormData = z.infer<typeof schema>;

const DIGITAL_METHODS = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn', label: 'MTN MoMo' },
  { value: 'card', label: 'Carte bancaire' },
];

export default function PurchasePage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const formulaIdParam = searchParams.get('formula');

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('digital');
  const [digitalMethod, setDigitalMethod] = useState<string>('wave');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', params.slug],
    queryFn: async () => (await api.get<EventDetailPublic>(`/events/${params.slug}`)).data,
    enabled: Boolean(params.slug),
  });

  const selectedFormula = useMemo<FormulaPublic | undefined>(
    () => event?.formulas.find((f) => f.id === formulaIdParam) ?? event?.formulas[0],
    [event, formulaIdParam],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ticket_delivery_pref: 'both', country: 'Côte d’Ivoire' },
  });

  const createOrder = useMutation({
    mutationFn: async (payload: OrderCreateRequest) =>
      (await api.post<OrderCreateResponse>('/orders/', payload)).data,
    onSuccess: (order) => {
      if (order.payment_mode === 'digital' && order.checkout_url) {
        window.location.href = order.checkout_url;
        return;
      }
      if (order.payment_mode === 'manual') {
        router.push(`/paiement/manuel?order_id=${order.order_id}`);
        return;
      }
      router.push(`/en-attente?order_id=${order.order_id}`);
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  if (isLoading || !event) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="mb-6 h-16 w-3/4" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!selectedFormula) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertDescription>Aucune formule disponible pour cet événement.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const cfg = event.payment_config;
  const digitalOK = cfg?.is_digital_enabled ?? true;
  const manualOK = cfg?.is_manual_enabled ?? false;

  const onSubmit = form.handleSubmit((values) => {
    createOrder.mutate({
      event_id: event.id,
      formula_id: selectedFormula.id,
      participant: {
        ...values,
        city: values.city || null,
      },
      payment_mode: paymentMode,
      payment_method_label: paymentMode === 'digital' ? digitalMethod : null,
    });
  });

  return (
    <ThemeWrapper template={event.template}>
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold">Finaliser mon achat</h1>
        <p className="mb-6 text-muted-foreground">{event.name}</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedFormula.name}</span>
              <Badge variant="secondary">{selectedFormula.channel}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFCFA(selectedFormula.price)}</div>
            {selectedFormula.description && (
              <p className="mt-2 text-sm text-muted-foreground">{selectedFormula.description}</p>
            )}
          </CardContent>
        </Card>

        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Vos informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input id="first_name" {...form.register('first_name')} />
                  <FieldError message={form.formState.errors.first_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input id="last_name" {...form.register('last_name')} />
                  <FieldError message={form.formState.errors.last_name?.message} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                <FieldError message={form.formState.errors.email?.message} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp (indicatif inclus)</Label>
                  <Input id="whatsapp" placeholder="+2250700000000" {...form.register('whatsapp')} />
                  <FieldError message={form.formState.errors.whatsapp?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" {...form.register('country')} />
                  <FieldError message={form.formState.errors.country?.message} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville (facultatif)</Label>
                  <Input id="city" {...form.register('city')} />
                </div>
                <div className="space-y-2">
                  <Label>Réception du billet</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...form.register('ticket_delivery_pref')}
                  >
                    <option value="both">Email + WhatsApp</option>
                    <option value="email">Email seul</option>
                    <option value="whatsapp">WhatsApp seul</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Mode de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <PaymentModeButton
                  active={paymentMode === 'digital'}
                  onClick={() => setPaymentMode('digital')}
                  title="Mobile Money / Carte"
                  subtitle="Wave, Orange Money, MTN, Carte bancaire"
                  disabled={!digitalOK}
                />
                <PaymentModeButton
                  active={paymentMode === 'manual'}
                  onClick={() => setPaymentMode('manual')}
                  title="Transfert international"
                  subtitle="Western Union, RIA, MoneyGram — envoi de reçu"
                  disabled={!manualOK}
                />
              </div>

              {paymentMode === 'digital' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Choisir un moyen</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {DIGITAL_METHODS.map((m) => (
                        <button
                          type="button"
                          key={m.value}
                          onClick={() => setDigitalMethod(m.value)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                            digitalMethod === m.value
                              ? 'border-primary bg-primary/10'
                              : 'hover:bg-accent'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {paymentMode === 'manual' && cfg && (
                <Alert variant="info">
                  <AlertDescription>
                    Après validation, vous serez guidé vers l'écran d'envoi de votre preuve de
                    transfert. Bénéficiaire :{' '}
                    <strong>
                      {cfg.beneficiary_name} — {cfg.beneficiary_city}, {cfg.beneficiary_country}
                    </strong>
                    .
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={createOrder.isPending}>
            {createOrder.isPending ? 'Traitement…' : `Payer ${formatFCFA(selectedFormula.price)}`}
          </Button>
        </form>
      </main>
    </ThemeWrapper>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function PaymentModeButton({
  active,
  onClick,
  title,
  subtitle,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-4 text-left transition ${
        active ? 'border-primary bg-primary/5' : 'hover:bg-accent'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}
