'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Eye, X } from 'lucide-react';

import { toApiError } from '@/lib/api';
import {
  getManualPayments,
  rejectManualPayment,
  validateManualPayment,
} from '@/lib/api/admin/manual-payments';
import { formatFCFA } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ManualPaymentAdmin } from '@/types/admin';
import { StatusBadge } from '@/components/admin/table/StatusBadge';

const TABS: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validés' },
  { value: 'rejected', label: 'Rejetés' },
  { value: '', label: 'Tous' },
];

const OPERATORS: Record<string, string> = {
  western_union: 'Western Union',
  ria: 'RIA',
  moneygram: 'MoneyGram',
};

export default function ManualPaymentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin', 'manual-payments', tab],
    queryFn: () => getManualPayments(tab),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'manual-payments'] });

  const validate = useMutation({
    mutationFn: (id: string) => validateManualPayment(id),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Validé — ${res.tickets_generated} billet(s) généré(s).`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectManualPayment(id, reason),
    onSuccess: () => {
      invalidate();
      setRejectId(null);
      setRejectReason('');
      toast.success('Paiement rejeté.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Paiements manuels</h1>
        <p className="text-sm text-muted-foreground">
          Validation des transferts (Western Union, RIA, MoneyGram) → génération du billet.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !payments?.length ? (
        <p className="text-sm text-muted-foreground">Aucun paiement dans cette catégorie.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <PaymentCard
              key={p.id}
              p={p}
              rejecting={rejectId === p.id}
              rejectReason={rejectReason}
              busy={validate.isPending || reject.isPending}
              onPreview={() => setPreview(p.receipt_image_url)}
              onValidate={() => {
                if (confirm('Valider ce paiement et générer le(s) billet(s) ?')) validate.mutate(p.id);
              }}
              onStartReject={() => {
                setRejectId(p.id);
                setRejectReason('');
              }}
              onCancelReject={() => setRejectId(null)}
              onChangeReason={setRejectReason}
              onConfirmReject={() => reject.mutate({ id: p.id, reason: rejectReason })}
            />
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Reçu de paiement"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

function PaymentCard({
  p,
  rejecting,
  rejectReason,
  busy,
  onPreview,
  onValidate,
  onStartReject,
  onCancelReject,
  onChangeReason,
  onConfirmReject,
}: {
  p: ManualPaymentAdmin;
  rejecting: boolean;
  rejectReason: string;
  busy: boolean;
  onPreview: () => void;
  onValidate: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onChangeReason: (v: string) => void;
  onConfirmReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {p.participant.first_name} {p.participant.last_name}
            </span>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {p.event.name} — {p.formula.name}
          </p>
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{formatFCFA(p.order.amount)}</span>
            <span className="mx-2 text-muted-foreground">via</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {OPERATORS[p.operator] ?? p.operator}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Envoyeur : {p.sender_name} ({p.sender_country}) · {p.participant.email}
            {p.participant.whatsapp ? ` · ${p.participant.whatsapp}` : ''}
          </p>
          {p.rejection_reason && (
            <p className="text-xs font-medium text-destructive">Motif : {p.rejection_reason}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            title="Voir le reçu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
          </button>
          {p.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={onValidate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Valider
              </button>
              <button
                type="button"
                onClick={onStartReject}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Rejeter
              </button>
            </>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <textarea
            placeholder="Motif du rejet (obligatoire, communiqué à l'acheteur)…"
            value={rejectReason}
            onChange={(e) => onChangeReason(e.target.value)}
            rows={2}
            className="min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="button"
            disabled={rejectReason.trim().length < 3 || busy}
            onClick={onConfirmReject}
            className="rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Confirmer le rejet
          </button>
          <button
            type="button"
            onClick={onCancelReject}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
