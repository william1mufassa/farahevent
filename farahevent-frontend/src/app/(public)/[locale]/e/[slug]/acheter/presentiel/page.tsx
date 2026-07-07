import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getEventConfig } from '@/lib/api/events';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';
import { PurchaseScreen } from '@/components/purchase/PurchaseScreen';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const config = await getEventConfig(params.slug);
  if (!config) return {};
  const t = await getTranslations('purchase');
  return {
    title: `${l(config.event.name, params.locale as Locale)} — ${t('channelPresentiel')}`,
    robots: { index: false },
  };
}

export default async function BuyPresentielPage({ params }: { params: Params }) {
  const config = await getEventConfig(params.slug);
  if (!config) notFound();
  return (
    <PurchaseScreen config={config} channel="presentiel" locale={params.locale as Locale} />
  );
}
