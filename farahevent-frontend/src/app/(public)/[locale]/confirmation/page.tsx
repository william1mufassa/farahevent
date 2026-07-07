'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { Link } from '@/lib/i18n/navigation';
import { SOFT_BORDER } from '@/lib/styles';
import { formatFCFA } from '@/lib/utils';
import type { OrderPublicStatus } from '@/types/order';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Confirmation post-paiement (CDC §4.4) : ✓ animée (stroke-dasharray),
 * récap commande, QR en aperçu (présentiel) ou message « lien 2 h avant »
 * (online), lien re-livraison.
 */
export default function ConfirmationPage() {
  const t = useTranslations('confirmation');
  const tCommon = useTranslations('common');
  const orderId = useSearchParams().get('order_id');

  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
  });

  const isOnline = data?.formula.channel === 'online';
  const homeHref = data?.event.slug ? `/e/${data.event.slug}` : '/';

  return (
    <main className="container mx-auto max-w-xl px-4 py-16">
      <div className="rounded-lg border p-8 text-center" style={SOFT_BORDER}>
        <AnimatedCheck />
        <h1 className="mt-4 text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm opacity-75">{t('body')}</p>

        {data?.qr_image_url && (
          <div className="mx-auto mt-6 w-fit rounded-md border p-3" style={SOFT_BORDER}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qr_image_url} alt={t('qrAlt')} className="h-44 w-44" />
          </div>
        )}

        {isOnline && (
          <Alert variant="info" className="mt-6 text-left">
            <AlertDescription>{t('onlineNotice')}</AlertDescription>
          </Alert>
        )}

        {data && (
          <dl className="mt-6 space-y-2 rounded-md bg-black/[0.04] p-4 text-left text-sm">
            <RecapRow label={t('event')} value={data.event.name} />
            <RecapRow label={t('formula')} value={data.formula.name} />
            <RecapRow label={t('amount')} value={formatFCFA(data.amount)} />
            <RecapRow label={t('reference')} value={`#${data.id.slice(-8).toUpperCase()}`} mono />
          </dl>
        )}

        <p className="mt-6 text-sm opacity-75">{t('checkInbox')}</p>

        <div className="mt-6 space-y-3">
          <Link
            href="/billet"
            className="block w-full rounded-md border px-6 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
            style={SOFT_BORDER}
          >
            {t('notReceived')}
          </Link>
          <Link
            href={homeHref}
            className="block w-full rounded-md bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {tCommon('backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}

function RecapRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="opacity-60">{label}</dt>
      <dd className={mono ? 'font-mono font-medium' : 'font-medium'}>{value}</dd>
    </div>
  );
}

/** ✓ dessinée au chargement via stroke-dasharray (keyframes draw-stroke, globals.css). */
function AnimatedCheck() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="mx-auto h-16 w-16"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        className="text-emerald-500"
        strokeWidth="3"
        style={{
          strokeDasharray: 176,
          strokeDashoffset: 176,
          animation: 'draw-stroke 0.6s ease-out forwards',
        }}
      />
      <path
        d="M20 33 L29 42 L45 24"
        className="text-emerald-500"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: 40,
          animation: 'draw-stroke 0.4s ease-out 0.45s forwards',
        }}
      />
    </svg>
  );
}
