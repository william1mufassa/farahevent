'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, CheckCircle } from 'lucide-react';

import { api, toApiError } from '@/lib/api';
import { SOFT_BORDER } from '@/lib/styles';

export default function ResendTicketPage() {
  const t = useTranslations('resend');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [sent, setSent] = useState<null | { tickets_count: number; channels: string[] }>(null);

  const resend = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ tickets_count: number; channels: string[] }>('/tickets/resend', {
          email,
          order_id: orderId,
        })
      ).data,
    onSuccess: (data) => {
      setSent(data);
      toast.success(t('success'));
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-10" style={SOFT_BORDER}>
        <div className="mb-8 text-center">
          <Send className="mx-auto h-10 w-10 text-[var(--color-primary,#e63946)]" />
          <h1 className="mt-4 text-2xl font-bold">{t('title')}</h1>
        </div>

        {sent ? (
          <div className="rounded-xl bg-emerald-50 p-6 text-center text-emerald-800">
            <CheckCircle className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm leading-relaxed">
              {t('sentSummary', {
                count: sent.tickets_count,
                channels: sent.channels.join(' + '),
              })}
            </p>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              resend.mutate();
            }}
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div>
              <label htmlFor="order_id" className="mb-1.5 block text-sm font-medium">
                {t('orderLabel')}
              </label>
              <input
                id="order_id"
                required
                placeholder={t('orderPlaceholder')}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={resend.isPending}
              className="w-full rounded-xl bg-[var(--color-primary,#e63946)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {resend.isPending ? t('submitting') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
