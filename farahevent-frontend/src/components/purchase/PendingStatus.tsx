'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Hourglass, MessageCircle } from 'lucide-react';

import { api } from '@/lib/api';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { SOFT_BORDER } from '@/lib/styles';
import type { OrderPublicStatus } from '@/types/order';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Statut « en attente » (CDC §4.5) : sablier animé, référence à communiquer
 * au support, polling du statut → redirection automatique quand la commande
 * est validée (confirmation) ou rejetée (echec).
 */
export function PendingStatus({
  orderId,
  supportName,
  supportWhatsapp,
}: {
  orderId: string | null;
  supportName: string | null;
  supportWhatsapp: string | null;
}) {
  const t = useTranslations('pending');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      // Arrête le polling quand le statut est terminal
      if (s === 'PAID' || s === 'MANUAL_VALIDATED') return false;
      if (s === 'FAILED' || s === 'REJECTED' || s === 'REFUNDED') return false;
      return 5000;
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data.status === 'PAID' || data.status === 'MANUAL_VALIDATED') {
      router.replace(`/confirmation?order_id=${data.id}`);
    } else if (data.status === 'FAILED' || data.status === 'REJECTED') {
      router.replace(`/echec?order_id=${data.id}&reason=${data.status}`);
    }
  }, [data, router]);

  if (!orderId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('missingOrder')}</AlertDescription>
      </Alert>
    );
  }

  const waLink = supportWhatsapp
    ? `https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        t('waPrefill', { reference: shortRef(orderId) }),
      )}`
    : null;
  const homeHref = data?.event.slug ? `/e/${data.event.slug}` : '/';

  return (
    <div className="rounded-lg border p-8 text-center" style={SOFT_BORDER}>
      <Hourglass
        aria-hidden
        className="mx-auto h-14 w-14 text-[var(--color-primary)] [animation:hourglass-flip_2.4s_ease-in-out_infinite]"
      />
      <h1 className="mt-4 text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm opacity-75">{t('etaManual')}</p>

      <dl className="mt-6 space-y-2 rounded-md bg-black/[0.04] p-4 text-left text-sm">
        <div className="flex justify-between gap-4">
          <dt className="opacity-60">{t('reference')}</dt>
          <dd className="font-mono font-medium">{shortRef(orderId)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="opacity-60">{t('statusLabel')}</dt>
          <dd className="font-medium">{t('statusPending')}</dd>
        </div>
        {data && (
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">{t('order')}</dt>
            <dd className="font-medium">
              {[data.event.name, data.formula.name].filter(Boolean).join(' — ')}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-6 text-sm opacity-75">{t('autoRefresh')}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={homeHref}
          className="rounded-md border px-6 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          style={SOFT_BORDER}
        >
          {tCommon('backHome')}
        </Link>
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            {t('contactSupport', { service: supportName ?? 'Support' })}
          </a>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function shortRef(orderId: string): string {
  return `#${orderId.slice(-8).toUpperCase()}`;
}
