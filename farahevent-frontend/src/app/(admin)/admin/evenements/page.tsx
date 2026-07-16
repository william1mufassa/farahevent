'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, AlertTriangle, ArrowRight, X } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { EventAdmin } from '@/types/admin';
import { formatEventDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-emerald-100 text-emerald-700',
  live: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
};

export default function EventsListPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [draftPopup, setDraftPopup] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Détecte si on revient d'une création d'événement (draft)
  useEffect(() => {
    const newDraftId = searchParams.get('new_draft');
    const newDraftName = searchParams.get('draft_name');
    if (newDraftId && newDraftName) {
      setDraftPopup({ id: newDraftId, name: decodeURIComponent(newDraftName) });
      // Nettoyer l'URL sans recharger
      window.history.replaceState({}, '', '/admin/evenements');
    }
  }, [searchParams]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => (await adminApi.get<EventAdmin[]>('/admin/events/')).data,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/events/${id}`),
    // Mise à jour optimiste : retirer l'événement immédiatement de l'UI
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['admin', 'events'] });
      const previous = qc.getQueryData<EventAdmin[]>(['admin', 'events']);
      qc.setQueryData<EventAdmin[]>(['admin', 'events'], (old) =>
        old ? old.filter((e) => e.id !== id) : [],
      );
      setConfirmDelete(null);
      return { previous };
    },
    onSuccess: () => {
      toast.success('Événement supprimé.');
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
    onError: (e, _id, context) => {
      // Restaurer les données si l'API échoue
      if (context?.previous) {
        qc.setQueryData(['admin', 'events'], context.previous);
      }
      toast.error(toApiError(e).message);
    },
  });

  const filtered = events?.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Nombre de drafts pour le bandeau
  const draftCount = filtered?.filter((e) => e.status === 'draft').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Popup suggestion de compléter un draft */}
      {draftPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setDraftPopup(null)}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Événement créé en brouillon</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <strong>&ldquo;{draftPopup.name}&rdquo;</strong> a été créé avec succès mais il est encore en <Badge variant="outline" className="ml-1">draft</Badge>.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complétez-le maintenant pour ajouter les formules, le design, le contenu et le rendre visible au public.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDraftPopup(null)}
                >
                  Plus tard
                </Button>
                <Button
                  className="flex-1 gap-1"
                  onClick={() => {
                    setDraftPopup(null);
                    router.push(`/admin/evenements/${draftPopup.id}`);
                  }}
                >
                  Compléter maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Supprimer cet événement ?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cette action est irréversible. L&apos;événement et toutes ses données seront supprimés.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(null)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(confirmDelete)}
                >
                  {deleteMut.isPending ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Événements</h1>
        <Link href="/admin/evenements/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Créer
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Rechercher un événement..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Bandeau drafts en attente */}
      {draftCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">
              {draftCount} événement{draftCount > 1 ? 's' : ''} en brouillon
            </span>
            <span className="text-amber-600/80 dark:text-amber-500/80">
              — cliquez sur le crayon pour les compléter
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-48 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filtered?.length ? (
        <p className="text-muted-foreground">Aucun événement.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((evt) => (
            <Card
              key={evt.id}
              className={`transition-all duration-200 ${
                evt.status === 'draft'
                  ? 'border-amber-200 dark:border-amber-900/30'
                  : ''
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{evt.name}</CardTitle>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[evt.status] ?? ''}`}
                  >
                    {evt.status}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {evt.mode}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Template {evt.template}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/evenements/${evt.id}`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/e/${evt.slug}`} target="_blank">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(evt.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <span>{formatEventDate(evt.date)}</span>
                {evt.location && <span className="ml-3">{evt.location}</span>}
                <span className="ml-3">/{evt.slug}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
