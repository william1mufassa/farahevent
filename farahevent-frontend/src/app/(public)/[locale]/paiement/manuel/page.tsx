import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getEventConfig } from '@/lib/api/events';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';

import { ThemeInjector } from '@/components/shared/ThemeInjector';
import { Navbar } from '@/components/shared/Navbar';
import { ManualProofForm } from '@/components/purchase/ManualProofForm';
import { MANUAL_OPERATORS, type ManualOperator } from '@/components/purchase/schema';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SearchParams = { order_id?: string; e?: string; op?: string };

export const metadata: Metadata = { robots: { index: false } };

/**
 * Écran preuve de paiement manuel — URL résumable après le transfert :
 * /paiement/manuel?order_id=…&e={slug}&op={operator}
 */
export default async function ManualPaymentPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  const locale = params.locale as Locale;
  const t = await getTranslations('manualProof');

  const orderId = searchParams.order_id;
  const config = searchParams.e ? await getEventConfig(searchParams.e) : null;
  const operator: ManualOperator = (MANUAL_OPERATORS as readonly string[]).includes(
    searchParams.op ?? '',
  )
    ? (searchParams.op as ManualOperator)
    : 'western_union';

  const body = (
    <main className="container mx-auto max-w-2xl px-4 pb-24 pt-24">
      <h1 className="mb-8 font-serif text-3xl tracking-tight sm:text-4xl">{t('pageTitle')}</h1>
      {!orderId ? (
        <Alert variant="destructive">
          <AlertDescription>{t('missingOrder')}</AlertDescription>
        </Alert>
      ) : (
        <ManualProofForm
          orderId={orderId}
          slug={searchParams.e ?? null}
          initialOperator={operator}
          paymentManual={config?.payment_manual ?? null}
          locale={locale}
        />
      )}
    </main>
  );

  if (!config) {
    return <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">{body}</div>;
  }

  return (
    <ThemeInjector design={config.design}>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar
          eventName={l(config.event.name, locale)}
          logoUrl={config.event.logo_url}
          isLive={config.is_live}
          anchors={[]}
          homeHref={`/e/${config.event.slug}`}
          variant="solid"
        />
        {body}
      </div>
    </ThemeInjector>
  );
}
