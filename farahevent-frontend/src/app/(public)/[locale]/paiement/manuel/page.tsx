'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, toApiError } from '@/lib/api';
import { useRouter } from '@/lib/i18n/navigation';
import type { OrderPublicStatus } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Soumission de preuve de paiement manuel (provisoire).
 * Fondu dans le tunnel d'achat au Lot 3 (ManualPaymentFlow + i18n complet).
 */
const OPERATORS = [
  { value: 'western_union', label: 'Western Union' },
  { value: 'ria', label: 'RIA' },
  { value: 'moneygram', label: 'MoneyGram' },
  { value: 'other', label: 'Autre' },
];

export default function ManualPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const [operator, setOperator] = useState('western_union');
  const [senderName, setSenderName] = useState('');
  const [senderCountry, setSenderCountry] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Reçu obligatoire');
      const fd = new FormData();
      fd.append('operator', operator);
      fd.append('sender_name', senderName);
      fd.append('sender_country', senderCountry);
      fd.append('receipt', file);
      return (
        await api.post(`/orders/${orderId}/manual-payment`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      toast.success('Preuve reçue, validation sous 2 à 12h.');
      router.push(`/en-attente?order_id=${orderId}`);
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  if (!orderId) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertDescription>Identifiant de commande manquant.</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-bold">Envoyer votre preuve de paiement</h1>
      {order && (
        <p className="mb-6 text-muted-foreground">
          Commande <code className="text-sm">{order.id}</code> — {order.event.name} —{' '}
          {order.formula.name}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du transfert</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Opérateur</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPERATORS.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => setOperator(o.value)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      operator === o.value ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_name">Nom exact utilisé pour le transfert</Label>
              <Input
                id="sender_name"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_country">Pays d'envoi</Label>
              <Input
                id="sender_country"
                required
                value={senderCountry}
                onChange={(e) => setSenderCountry(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Reçu du transfert (JPEG ou PNG, 5 Mo max)</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Vous pouvez prendre une photo directement depuis votre téléphone ou choisir un
                fichier existant.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
              {submit.isPending ? 'Envoi…' : 'Envoyer la preuve'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
