'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatFCFA } from '@/lib/utils';
import type { ParticipantRow } from '@/types/participant';
import { StatusBadge } from '@/components/admin/table/StatusBadge';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Fiche participant en panneau latéral (CONCEPTION_FRONTEND.md §10.5). */
export function ParticipantSheet({
  participant,
  onClose,
}: {
  participant: ParticipantRow | null;
  onClose: () => void;
}) {
  const p = participant;

  return (
    <Dialog.Root open={!!p} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-2xl focus:outline-none">
          {p && (
            <>
              <div className="flex items-start justify-between border-b border-border p-5">
                <div>
                  <Dialog.Title className="text-lg font-bold">
                    {p.first_name} {p.last_name}
                  </Dialog.Title>
                  <p className="font-mono text-xs text-muted-foreground">{p.order_ref}</p>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Fermer"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  {p.scanned && (
                    <span className="inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-600">
                      Entré sur site
                    </span>
                  )}
                </div>

                <dl>
                  <Row label="Email" value={p.email} />
                  <Row label="WhatsApp" value={p.whatsapp} />
                  <Row label="Pays" value={[p.city, p.country].filter(Boolean).join(', ')} />
                  <Row label="Formule" value={p.formula} />
                  <Row label="Participation" value={p.channel === 'online' ? 'En ligne' : 'Présentiel'} />
                  <Row label="Paiement" value={p.payment_mode === 'manual' ? 'Manuel' : 'Digital'} />
                  <Row label="Montant" value={formatFCFA(p.amount)} />
                  <Row label="Commande" value={new Date(p.created_at).toLocaleString('fr-FR')} />
                </dl>
              </div>

              <div className="border-t border-border p-5">
                <button
                  type="button"
                  onClick={() => toast.success('Billet renvoyé par email + WhatsApp.')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                  Renvoyer le billet
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
