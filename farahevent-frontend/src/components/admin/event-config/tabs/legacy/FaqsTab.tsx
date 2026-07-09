'use client';

// Onglet Chatbot / FAQ — implémentation existante (backend réel).
// Refonte bilingue + tri au Lot 7b.

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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Faq {
  id: string;
  event_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export function FaqsTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['admin', 'faqs', eventId],
    queryFn: async () => (await adminApi.get<Faq[]>(`/admin/events/${eventId}/faqs`)).data,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { question: '', answer: '', sort_order: '0' },
  });

  const createMut = useMutation({
    mutationFn: async (form: Record<string, string>) =>
      adminApi.post(`/admin/events/${eventId}/faqs`, {
        question: form.question,
        answer: form.answer,
        sort_order: parseInt(form.sort_order, 10) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'faqs', eventId] });
      reset();
      setShowForm(false);
      toast.success('FAQ creee.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (fId: string) => adminApi.delete(`/admin/faqs/${fId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'faqs', eventId] });
      toast.success('FAQ supprimee.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">FAQ chatbot</h2>
          <p className="text-xs text-muted-foreground">
            Affichees dans le widget public de l evenement.
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
              <div className="space-y-1">
                <Label className="text-xs">Question</Label>
                <Input {...register('question', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reponse</Label>
                <Textarea {...register('answer', { required: true })} rows={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordre</Label>
                <Input type="number" {...register('sort_order')} className="w-24" />
              </div>
              <Button type="submit" size="sm" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creation...' : 'Creer la FAQ'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !faqs?.length ? (
        <p className="text-sm text-muted-foreground">Aucune FAQ.</p>
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div
              key={f.id}
              className={`rounded-md border p-3 text-sm ${!f.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.question}</p>
                  <p className="mt-1 text-muted-foreground">{f.answer}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Supprimer cette FAQ ?')) deleteMut.mutate(f.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
