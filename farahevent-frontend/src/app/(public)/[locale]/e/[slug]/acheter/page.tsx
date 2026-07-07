import { notFound } from 'next/navigation';
import { redirect } from '@/lib/i18n/navigation';
import { getEventConfig } from '@/lib/api/events';
import type { Locale } from '@/lib/i18n/routing';

type Params = { locale: string; slug: string };

/**
 * Route legacy /acheter?formula= : redirige vers la page dédiée au canal
 * de la formule demandée (CDC §4.1/4.2 — pages séparées présentiel / en ligne).
 */
export default async function LegacyBuyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: { formula?: string };
}) {
  const config = await getEventConfig(params.slug);
  if (!config) notFound();

  const formulaId = searchParams.formula;
  const formula = config.formulas.find((f) => f.id === formulaId);
  const target = formula?.channel === 'online' ? 'en-ligne' : 'presentiel';
  const query = formulaId ? `?formula=${encodeURIComponent(formulaId)}` : '';

  redirect({
    href: `/e/${params.slug}/acheter/${target}${query}`,
    locale: params.locale as Locale,
  });
}
