'use client';

// Onglet Paiement — implémentation existante (backend réel).
// Refonte bilingue instructions au Lot 7b.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { PaymentConfigAdmin } from '@/types/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function PaymentTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin', 'payment-config', eventId],
    queryFn: async () =>
      (await adminApi.get<PaymentConfigAdmin>(`/admin/events/${eventId}/payment-config`)).data,
  });

  const { register, handleSubmit, reset } = useForm();
  const [initialized, setInitialized] = useState(false);

  if (config && !initialized) {
    reset({
      beneficiary_name: config.beneficiary_name ?? '',
      beneficiary_country: config.beneficiary_country ?? '',
      beneficiary_city: config.beneficiary_city ?? '',
      amount_fcfa: config.amount_fcfa?.toString() ?? '',
      amount_eur: config.amount_eur?.toString() ?? '',
      amount_usd: config.amount_usd?.toString() ?? '',
      instructions_text: config.instructions_text ?? '',
      is_digital_enabled: config.is_digital_enabled,
      is_manual_enabled: config.is_manual_enabled,
    });
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: async (form: Record<string, unknown>) => {
      const body: Record<string, unknown> = {};
      if (form.beneficiary_name) body.beneficiary_name = form.beneficiary_name;
      if (form.beneficiary_country) body.beneficiary_country = form.beneficiary_country;
      if (form.beneficiary_city) body.beneficiary_city = form.beneficiary_city;
      if (form.amount_fcfa) body.amount_fcfa = parseFloat(form.amount_fcfa as string);
      if (form.amount_eur) body.amount_eur = parseFloat(form.amount_eur as string);
      if (form.amount_usd) body.amount_usd = parseFloat(form.amount_usd as string);
      if (form.instructions_text) body.instructions_text = form.instructions_text;
      body.is_digital_enabled = !!form.is_digital_enabled;
      body.is_manual_enabled = !!form.is_manual_enabled;
      return adminApi.put(`/admin/events/${eventId}/payment-config`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-config', eventId] });
      toast.success('Config paiement sauvegardee.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configuration paiement</h2>
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Beneficiaire</Label>
                <Input {...register('beneficiary_name')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pays</Label>
                <Input {...register('beneficiary_country')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ville</Label>
                <Input {...register('beneficiary_city')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Montant FCFA</Label>
                <Input type="number" step="0.01" {...register('amount_fcfa')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant EUR</Label>
                <Input type="number" step="0.01" {...register('amount_eur')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant USD</Label>
                <Input type="number" step="0.01" {...register('amount_usd')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instructions (affichees a l acheteur)</Label>
              <Textarea {...register('instructions_text')} rows={3} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('is_digital_enabled')} className="rounded" />
                Paiement digital active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('is_manual_enabled')} className="rounded" />
                Paiement manuel active
              </label>
            </div>
            <Button type="submit" size="sm" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
