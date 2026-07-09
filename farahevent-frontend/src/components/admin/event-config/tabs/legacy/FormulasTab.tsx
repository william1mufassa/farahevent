'use client';

// Onglet Formules — implémentation existante (backend réel). Refonte
// bilingue + drawer + drag-order prévue au Lot 7b.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { FormulaAdmin } from '@/types/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function FormulasTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: formulas, isLoading } = useQuery({
    queryKey: ['admin', 'formulas', eventId],
    queryFn: async () =>
      (await adminApi.get<FormulaAdmin[]>(`/admin/events/${eventId}/formulas`)).data,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
      advantages: '',
      price: '',
      currency: 'XOF',
      channel: 'presentiel',
      stock: '',
      sort_order: '0',
    },
  });

  const createMut = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const body: Record<string, unknown> = {
        name: form.name,
        price: parseFloat(form.price),
        channel: form.channel,
        sort_order: parseInt(form.sort_order, 10) || 0,
      };
      if (form.description) body.description = form.description;
      if (form.advantages) body.advantages = form.advantages;
      if (form.currency) body.currency = form.currency;
      if (form.stock) body.stock = parseInt(form.stock, 10);
      return adminApi.post(`/admin/events/${eventId}/formulas`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'formulas', eventId] });
      reset();
      setShowForm(false);
      toast.success('Formule creee.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (fId: string) => adminApi.delete(`/admin/formulas/${fId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'formulas', eventId] });
      toast.success('Formule desactivee.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Formules</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input {...register('name', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prix *</Label>
                  <Input type="number" step="0.01" {...register('price', { required: true })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input {...register('description')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avantages</Label>
                <Textarea {...register('advantages')} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Canal</Label>
                  <select
                    {...register('channel')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="presentiel">Presentiel</option>
                    <option value="online">Online</option>
                    <option value="both">Les deux</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" {...register('stock')} placeholder="Illimite" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ordre</Label>
                  <Input type="number" {...register('sort_order')} />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creation...' : 'Creer la formule'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !formulas?.length ? (
        <p className="text-sm text-muted-foreground">Aucune formule.</p>
      ) : (
        <div className="space-y-2">
          {formulas.map((f) => (
            <div
              key={f.id}
              className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                !f.is_active ? 'opacity-50' : ''
              }`}
            >
              <div>
                <span className="font-medium">{f.name}</span>
                <span className="mx-2 text-muted-foreground">
                  {f.price.toLocaleString()} {f.currency}
                </span>
                <Badge variant="outline" className="text-xs">
                  {f.channel}
                </Badge>
                {f.stock !== null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {f.sold_quantity}/{f.stock} vendus
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Desactiver cette formule ?')) deleteMut.mutate(f.id);
                }}
                disabled={!f.is_active}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
