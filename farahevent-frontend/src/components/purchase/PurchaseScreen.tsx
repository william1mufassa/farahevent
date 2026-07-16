import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';

import { Link } from '@/lib/i18n/navigation';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';
import { SOFT_BORDER } from '@/lib/styles';
import type { EventConfig } from '@/types/event-config';

import { ThemeInjector } from '@/components/shared/ThemeInjector';
import { Navbar } from '@/components/shared/Navbar';
import { PurchaseForm, type PurchaseChannel } from './PurchaseForm';

/**
 * Écran d'achat commun aux deux canaux (CDC §4.1/4.2) : navbar solide,
 * breadcrumb, puis formulaire 3 étapes — ou état « billetterie fermée ».
 */
export async function PurchaseScreen({
  config,
  channel,
  locale,
}: {
  config: EventConfig;
  channel: PurchaseChannel;
  locale: Locale;
}) {
  const t = await getTranslations('purchase');
  const name = l(config.event.name, locale);
  const isOpen = config.event.status === 'open';
  const channelLabel = channel === 'online' ? t('channelOnline') : t('channelPresentiel');
  const hasFormulas = config.formulas.some(
    (f) => f.channel === channel || f.channel === 'both',
  );

  return (
    <ThemeInjector design={config.design}>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar
          eventName={name}
          logoUrl={config.event.logo_url}
          isLive={config.is_live}
          anchors={[]}
          homeHref={`/e/${config.event.slug}`}
          variant="solid"
        />

        <main className="container mx-auto max-w-6xl px-4 pb-24 pt-24">
          <nav
            aria-label="breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-1.5 text-sm opacity-70"
          >
            <Link href={`/e/${config.event.slug}`} className="hover:underline">
              {t('breadcrumbHome')}
            </Link>
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            <span>{t('breadcrumbBuy')}</span>
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            <span className="font-medium">{channelLabel}</span>
          </nav>

          <h1 className="mb-8 font-serif text-3xl tracking-tight sm:text-4xl">
            {channel === 'online' ? t('titleOnline') : t('titlePresentiel')}
          </h1>

          {!isOpen ? (
            <Notice title={t('closedTitle')} body={t('closedBody')} slug={config.event.slug} cta={t('backToEvent')} />
          ) : !hasFormulas ? (
            <Notice title={t('noFormulas')} body={t('closedBody')} slug={config.event.slug} cta={t('backToEvent')} />
          ) : (
            <PurchaseForm config={config} channel={channel} locale={locale} />
          )}
        </main>
      </div>
    </ThemeInjector>
  );
}

function Notice({
  title,
  body,
  slug,
  cta,
}: {
  title: string;
  body: string;
  slug: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border p-8 text-center" style={SOFT_BORDER}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 opacity-70">{body}</p>
      <Link
        href={`/e/${slug}`}
        className="mt-6 inline-block rounded-md bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}
