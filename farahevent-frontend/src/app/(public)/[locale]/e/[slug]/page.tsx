import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getEventConfig } from '@/lib/api/events';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';

import { getTemplate } from '@/components/templates/registry';
import { SECTION_IDS } from '@/components/templates/types';
import type { TemplateKey } from '@/types/event-config';
import { ThemeInjector } from '@/components/shared/ThemeInjector';
import { PreviewBridge } from '@/components/shared/PreviewBridge';
import { Navbar, type NavAnchor } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CountdownBanner } from '@/components/shared/CountdownBanner';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';

/**
 * Landing événement — composition générique (CONCEPTION_FRONTEND.md §4.3) :
 * un seul fetch de config, puis les sections du template actif (A/B/C/D)
 * via le registry. La config décide QUOI afficher (toggles/options),
 * le template décide COMMENT.
 */

type Params = { locale: string; slug: string };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const config = await getEventConfig(params.slug);
  if (!config) return {};
  const locale = params.locale as Locale;
  const name = l(config.event.name, locale);
  return {
    title: name,
    description: stripHtml(l(config.content.description, locale)).slice(0, 160),
    openGraph: {
      title: name,
      images: [{ url: config.content.hero_image_url }],
    },
  };
}

const TEMPLATE_KEYS: TemplateKey[] = ['A', 'B', 'C', 'D'];

export default async function EventLandingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: { preview?: string; template?: string };
}) {
  const locale = params.locale as Locale;
  const config = await getEventConfig(params.slug);
  if (!config) notFound();

  // Mode aperçu admin (§10.4) : le template peut être surchargé par l'URL.
  const preview = searchParams?.preview === '1';
  const templateKey =
    preview && TEMPLATE_KEYS.includes(searchParams.template as TemplateKey)
      ? (searchParams.template as TemplateKey)
      : config.design.template;

  const T = getTemplate(templateKey);
  const { event, options, speakers, programme, stats, faqs, partners } = config;

  const showSpeakers = options.show_speakers && speakers.length > 0;
  const anchors: NavAnchor[] = [{ id: SECTION_IDS.about, key: 'about' }];
  if (showSpeakers) anchors.push({ id: SECTION_IDS.speakers, key: 'speakers' });
  if (programme.length > 0) anchors.push({ id: SECTION_IDS.programme, key: 'programme' });
  anchors.push({ id: SECTION_IDS.pricing, key: 'pricing' }, { id: SECTION_IDS.faq, key: 'faq' });

  // Abidjan = UTC toute l'année ; si un fuseau configurable arrive dans
  // EventConfig, le calcul se fera côté backend.
  const targetIso = `${event.date}T${event.start_time}:00Z`;

  return (
    <ThemeInjector design={config.design}>
      {preview && <PreviewBridge />}
      <div id="top" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar
          eventName={l(event.name, locale)}
          logoUrl={event.logo_url}
          isLive={config.is_live}
          anchors={anchors}
        />

        <T.Hero config={config} locale={locale} />
        <T.About config={config} locale={locale} />
        {showSpeakers && <T.Speakers config={config} locale={locale} />}
        {programme.length > 0 && <T.Programme config={config} locale={locale} />}

        {/* CDC template A : bandeau countdown au-dessus des cartes tarifs */}
        {options.show_countdown && <CountdownBanner targetIso={targetIso} />}
        <T.Formulas config={config} locale={locale} />

        {stats.length > 0 && <T.Stats config={config} locale={locale} />}
        {faqs.length > 0 && <T.Faq config={config} locale={locale} />}
        {partners.length > 0 && <T.Partners config={config} locale={locale} />}

        <Footer config={config} locale={locale} anchors={anchors} />

        {options.chatbot_enabled && (
          <ChatbotWidget
            eventSlug={event.slug}
            whatsappNumber={config.support.whatsapp_number}
            supportName={config.support.service_name}
            faqs={faqs.map((f) => ({
              id: f.id,
              question: l(f.question, locale),
              answer: l(f.answer, locale),
            }))}
          />
        )}
      </div>
    </ThemeInjector>
  );
}
