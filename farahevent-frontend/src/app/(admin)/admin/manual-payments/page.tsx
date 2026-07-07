'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X, Eye, Image as ImageIcon } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/utils';
import type { ManualPaymentAdmin } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  validated: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ManualPaymentsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin', 'manual-payments', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      return (await adminApi.get<ManualPaymentAdmin[]>(`/admin/manual-payments/${params}`)).data;
    },
  });

  const validateMut = useMutation({
    mutationFn: async (mpId: string) =>
      (await adminApi.post(`/admin/manual-payments/${mpId}/validate`)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'manual-payments'] });
      toast.success(`Valide ! ${data.tickets_generated} billet(s) genere(s).`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ mpId, reason }: { mpId: string; reason: string }) =>
      adminApi.post(`/admin/manual-payments/${mpId}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'manual-payments'] });
      setRejectId(null);
      setRejectReason('');
      toast.success('Paiement rejete.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paiements manuels</h1>

      <div className="flex gap-2">
        {['pending', 'validated', 'rejected', ''].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s || 'Tous'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : !payments?.length ? (
        <p className="text-muted-foreground">Aucun paiement manuel.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {p.participant.first_name} {p.participant.last_name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? ''}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{p.event.name}</span>
                      <span className="mx-2">-</span>
                      <span>{p.formula.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-mono">
                        {p.order.amount.toLocaleString()} {p.order.currency}
                      </span>
                      <span className="mx-2">via</span>
                      <Badge variant="outline">{p.operator.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Envoyeur : {p.sender_name} ({p.sender_country})
                      <span className="mx-2">|</span>
                      Email : {p.participant.email}
                      {p.participant.whatsapp && (
                        <>
                          <span className="mx-2">|</span>
                          WA : {p.participant.whatsapp}
                        </>
                      )}
                    </div>
                    {p.rejection_reason && (
                      <p className="text-xs text-destructive">Motif : {p.rejection_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewImage(p.receipt_image_url)}
                      title="Voir le recu"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    {p.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm('Valider ce paiement et generer le(s) billet(s) ?'))
                              validateMut.mutate(p.id);
                          }}
                          disabled={validateMut.isPending}
                        >
                          <Check className="mr-1 h-4 w-4" /> Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectId(p.id)}
                        >
                          <X className="mr-1 h-4 w-4" /> Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {rejectId === p.id && (
                  <div className="mt-3 flex items-end gap-2 border-t pt-3">
                    <div className="flex-1 space-y-1">
                      <Textarea
                        placeholder="Motif du rejet (obligatoire)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={rejectReason.length < 3 || rejectMut.isPending}
                      onClick={() => rejectMut.mutate({ mpId: p.id, reason: rejectReason })}
                    >
                      Confirmer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-lg bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Recu de paiement" className="max-h-[75vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
