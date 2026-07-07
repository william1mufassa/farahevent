import type { Metadata } from 'next';
import { getEventConfig } from '@/lib/api/events';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';

import { ThemeInjector } from '@/components/shared/ThemeInjector';
import { Navbar } from '@/components/shared/Navbar';
import { PendingStatus } from '@/components/purchase/PendingStatus';

type SearchParams = { order_id?: string; e?: string };

export const metadata: Metadata = { robots: { index: false } };

/**
 * Paiement manuel soumis (CDC §4.5). Le slug `e` (optionnel) permet de
 * theming + CTA WhatsApp support depuis la config de l'événement.
 */
export default async function PendingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  const locale = params.locale as Locale;
  const config = searchParams.e ? await getEventConfig(searchParams.e) : null;

  const body = (
    <main className="container mx-auto max-w-xl px-4 pb-24 pt-24">
      <PendingStatus
        orderId={searchParams.order_id ?? null}
        supportName={config?.support.service_name ?? null}
        supportWhatsapp={config?.support.whatsapp_number ?? null}
      />
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
