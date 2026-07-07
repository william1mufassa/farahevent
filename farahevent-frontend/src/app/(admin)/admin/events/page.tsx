'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => (await adminApi.get<EventAdmin[]>('/admin/events/')).data,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Evenement supprime.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const filtered = events?.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Evenements</h1>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Creer
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Rechercher un evenement..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : !filtered?.length ? (
        <p className="text-muted-foreground">Aucun evenement.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((evt) => (
            <Card key={evt.id}>
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
                  <Link href={`/admin/events/${evt.id}`}>
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
                    onClick={() => {
                      if (confirm('Supprimer cet evenement ?')) deleteMut.mutate(evt.id);
                    }}
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
