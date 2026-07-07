'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { EventAdmin, FormulaAdmin, PaymentConfigAdmin } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Tab = 'details' | 'formulas' | 'cms' | 'payment' | 'whatsapp' | 'faqs';

const TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['live', 'closed'],
  live: ['closed'],
  closed: [],
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('details');

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: async () => (await adminApi.get<EventAdmin>(`/admin/events/${id}`)).data,
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;
  if (!event) return <p className="text-destructive">Evenement non trouve.</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'formulas', label: 'Formules' },
    { key: 'cms', label: 'CMS' },
    { key: 'payment', label: 'Paiement' },
    { key: 'whatsapp', label: 'Groupes WA' },
    { key: 'faqs', label: 'FAQ' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <Badge variant="outline">{event.status}</Badge>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && <EventDetailsTab event={event} />}
      {tab === 'formulas' && <FormulasTab eventId={id} />}
      {tab === 'cms' && <CmsTab eventId={id} />}
      {tab === 'payment' && <PaymentTab eventId={id} />}
      {tab === 'whatsapp' && <WhatsappGroupsTab eventId={id} />}
      {tab === 'faqs' && <FaqsTab eventId={id} />}
    </div>
  );
}

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

function WhatsappGroupsTab({ eventId }: { eventId: string }) {
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
                g.is_full ? 'bg-amber-50 border-amber-200' : ''
              } ${!g.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Badge variant="outline" className="text-xs shrink-0">
                  {g.category}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {g.invite_link}
                </span>
                <span className="text-xs shrink-0">
                  {g.current_count} / {g.max_capacity}
                </span>
                {g.is_full && (
                  <Badge variant="destructive" className="text-xs shrink-0">
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

interface Faq {
  id: string;
  event_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

function FaqsTab({ eventId }: { eventId: string }) {
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
                <div className="flex-1 min-w-0">
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

function EventDetailsTab({ event }: { event: EventAdmin }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: event.name,
      description: event.description ?? '',
      location: event.location ?? '',
      venue_city: event.venue_city ?? '',
      max_capacity: event.max_capacity?.toString() ?? '',
      cover_image_url: event.cover_image_url ?? '',
    },
  });

  const update = useMutation({
    mutationFn: async (form: Record<string, unknown>) => {
      const body: Record<string, unknown> = {};
      if (form.name) body.name = form.name;
      if (form.description !== undefined) body.description = form.description || null;
      if (form.location !== undefined) body.location = form.location || null;
      if (form.venue_city !== undefined) body.venue_city = form.venue_city || null;
      if (form.max_capacity) body.max_capacity = parseInt(form.max_capacity as string, 10);
      if (form.cover_image_url !== undefined) body.cover_image_url = form.cover_image_url || null;
      return adminApi.patch(`/admin/events/${event.id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'event', event.id] });
      toast.success('Evenement mis a jour.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) =>
      adminApi.patch(`/admin/events/${event.id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'event', event.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Statut mis a jour.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const nextStatuses = TRANSITIONS[event.status] ?? [];

  return (
    <div className="space-y-6">
      {nextStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transition de statut</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                variant={s === 'live' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => statusMut.mutate(s)}
                disabled={statusMut.isPending}
              >
                Passer a &quot;{s}&quot;
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input {...register('location')} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input {...register('venue_city')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacite max</Label>
                <Input type="number" {...register('max_capacity')} />
              </div>
              <div className="space-y-2">
                <Label>Image couverture (URL)</Label>
                <Input {...register('cover_image_url')} />
              </div>
            </div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FormulasTab({ eventId }: { eventId: string }) {
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

function CmsTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cms', eventId],
    queryFn: async () =>
      (await adminApi.get<{ entries: Record<string, string> }>(`/admin/events/${eventId}/content`))
        .data,
  });

  const [entries, setEntries] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setEntries(data.entries ?? {});
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => adminApi.put(`/admin/events/${eventId}/content`, { entries }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cms', eventId] });
      toast.success('Contenu sauvegarde.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  function addEntry() {
    if (!newKey.trim()) return;
    setEntries((prev) => ({ ...prev, [newKey.trim()]: newValue }));
    setNewKey('');
    setNewValue('');
  }

  function removeEntry(key: string) {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contenu CMS</h2>
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      <div className="space-y-2">
        {Object.entries(entries).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <Input value={key} disabled className="w-40 shrink-0" />
            <Textarea
              value={value}
              onChange={(e) =>
                setEntries((prev) => ({ ...prev, [key]: e.target.value }))
              }
              rows={2}
              className="flex-1"
            />
            <Button variant="ghost" size="sm" onClick={() => removeEntry(key)}>
              &times;
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Cle</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="hero_title"
            className="w-40"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Valeur</Label>
          <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={addEntry}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function PaymentTab({ eventId }: { eventId: string }) {
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
