'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, MessageCircle, Send, Users } from 'lucide-react';

import {
  countRecipients,
  sendCampaign,
  type Audience,
  type CommChannel,
} from '@/lib/api/admin/communications';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FIELD, LBL } from '@/components/admin/event-config/fieldStyles';
import { SelectFilter } from '@/components/admin/table/filters';

const CHANNELS: Array<{ value: CommChannel; label: string; icon: typeof Mail }> = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'both', label: 'Les deux', icon: Send },
];

export default function CommunicationsPage() {
  const [audience, setAudience] = useState<Audience>({ channel: '', status: '' });
  const [channel, setChannel] = useState<CommChannel>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: count = 0, isFetching } = useQuery({
    queryKey: ['admin', 'recipients', audience],
    queryFn: () => countRecipients(audience),
  });

  const send = useMutation({
    mutationFn: () => sendCampaign({ channel, subject, message, audience }),
    onSuccess: (res) => toast.success(`Campagne envoyée à ${res.sent} destinataire(s).`),
    onError: (e) => toast.error(toApiError(e).message),
  });

  const withEmail = channel === 'email' || channel === 'both';
  const canSend = count > 0 && message.trim().length > 0 && (!withEmail || subject.trim().length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-sm text-muted-foreground">Message ciblé par email / WhatsApp aux participants.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Audience</h2>
            <div className="flex flex-wrap gap-2">
              <SelectFilter
                value={audience.channel ?? ''}
                onChange={(v) => setAudience((a) => ({ ...a, channel: v as Audience['channel'] }))}
                allLabel="Toute participation"
                options={[
                  { value: 'presentiel', label: 'Présentiel' },
                  { value: 'online', label: 'En ligne' },
                ]}
              />
              <SelectFilter
                value={audience.status ?? ''}
                onChange={(v) => setAudience((a) => ({ ...a, status: v as Audience['status'] }))}
                allLabel="Tout statut"
                options={[
                  { value: 'paid', label: 'Payé' },
                  { value: 'pending', label: 'En attente' },
                ]}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Canal</h2>
            <div className="flex gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition',
                    channel === c.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  <c.icon className="h-4 w-4" />
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Message</h2>
            {withEmail && (
              <div className="space-y-1">
                <label className={LBL}>Objet (email)</label>
                <input className={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <label className={LBL}>Contenu</label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bonjour {prénom}, …"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
            <Users className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-3xl font-bold tabular-nums">{isFetching ? '…' : count}</p>
            <p className="text-sm text-muted-foreground">destinataire(s)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>
            {withEmail && <p className="text-sm font-semibold">{subject || 'Objet…'}</p>}
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {message || 'Votre message apparaîtra ici.'}
            </p>
          </div>

          <button
            type="button"
            disabled={!canSend || send.isPending}
            onClick={() => {
              if (confirm(`Envoyer ce message à ${count} destinataire(s) ?`)) send.mutate();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {send.isPending ? 'Envoi…' : `Envoyer (${count})`}
          </button>
        </aside>
      </div>
    </div>
  );
}
