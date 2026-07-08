'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { EventAdmin } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface EventForm {
  slug: string;
  name: string;
  description: string;
  mode: string;
  template: string;
  date: string;
  end_time: string;
  location: string;
  venue_city: string;
  max_capacity: string;
  cover_image_url: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EventForm>({
    defaultValues: { mode: 'presentiel', template: 'A' },
  });

  const create = useMutation({
    mutationFn: async (form: EventForm) => {
      const body: Record<string, unknown> = {
        slug: form.slug,
        name: form.name,
        mode: form.mode,
        template: form.template,
        date: new Date(form.date).toISOString(),
      };
      if (form.description) body.description = form.description;
      if (form.end_time) body.end_time = new Date(form.end_time).toISOString();
      if (form.location) body.location = form.location;
      if (form.venue_city) body.venue_city = form.venue_city;
      if (form.max_capacity) body.max_capacity = parseInt(form.max_capacity, 10);
      if (form.cover_image_url) body.cover_image_url = form.cover_image_url;
      return (await adminApi.post<EventAdmin>('/admin/events/', body)).data;
    },
    onSuccess: (evt) => {
      toast.success('Evenement cree.');
      router.push(`/admin/evenements/${evt.id}`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  function autoSlug(name: string) {
    setValue(
      'slug',
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Nouvel evenement</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                {...register('name', { required: true })}
                onChange={(e) => {
                  register('name').onChange(e);
                  autoSlug(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input {...register('slug', { required: true, pattern: /^[a-z0-9-]+$/ })} />
              <p className="text-xs text-muted-foreground">URL : /e/votre-slug</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mode *</Label>
                <select
                  {...register('mode')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="presentiel">Presentiel</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Template *</Label>
                <select
                  {...register('template')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="A">A - Sobre</option>
                  <option value="B">B - Festif</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de debut *</Label>
                <Input type="datetime-local" {...register('date', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input type="datetime-local" {...register('end_time')} />
              </div>
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
                <Label>Image de couverture (URL)</Label>
                <Input {...register('cover_image_url')} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creation...' : 'Creer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
