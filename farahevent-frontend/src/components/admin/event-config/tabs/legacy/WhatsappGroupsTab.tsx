'use client';

// Onglet Groupes WhatsApp — implémentation existante (backend réel).
// Refonte tri + basculement au Lot 7b.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WhatsappGroup {
  id: string;
  event_id: string;
  category: string;
  invite_link: string;
  max_capacity: number;
  current_count: number;
  sort_order: number;
  is_active: boolean;
  is_full: boolean;
}

export function WhatsappGroupsTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin', 'wa-groups', eventId],
    queryFn: async () =>
      (await adminApi.get<WhatsappGroup[]>(`/admin/events/${eventId}/whatsapp-groups`)).data,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      category: 'presentiel',
      invite_link: '',
      max_capacity: '900',
      sort_order: '0',
    },
  });

  const createMut = useMutation({
    mutationFn: async (form: Record<string, string>) =>
      adminApi.post(`/admin/events/${eventId}/whatsapp-groups`, {
        category: form.category,
        invite_link: form.invite_link,
        max_capacity: parseInt(form.max_capacity, 10) || 900,
        sort_order: parseInt(form.sort_order, 10) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wa-groups', eventId] });
      reset();
      setShowForm(false);
      toast.success('Groupe cree.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (gId: string) => adminApi.delete(`/admin/whatsapp-groups/${gId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wa-groups', eventId] });
      toast.success('Groupe supprime.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Groupes WhatsApp</h2>
          <p className="text-xs text-muted-foreground">
            Basculement automatique quand un groupe est plein (max 900 par defaut).
          </p>
        </div>
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
                  <Label className="text-xs">Categorie</Label>
                  <select
                    {...register('category')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="presentiel">Presentiel</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Capacite max</Label>
                  <Input type="number" {...register('max_capacity')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lien d invitation</Label>
                <Input
                  {...register('invite_link', { required: true })}
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordre</Label>
                <Input type="number" {...register('sort_order')} className="w-24" />
              </div>
              <Button type="submit" size="sm" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creation...' : 'Creer le groupe'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !groups?.length ? (
        <p className="text-sm text-muted-foreground">Aucun groupe.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                g.is_full ? 'border-amber-200 bg-amber-50' : ''
              } ${!g.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {g.category}
                </Badge>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {g.invite_link}
                </span>
                <span className="shrink-0 text-xs">
                  {g.current_count} / {g.max_capacity}
                </span>
                {g.is_full && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    plein
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Supprimer ce groupe ?')) deleteMut.mutate(g.id);
                }}
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
