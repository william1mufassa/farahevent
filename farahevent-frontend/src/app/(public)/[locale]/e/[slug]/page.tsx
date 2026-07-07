import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';

import { getEventConfig } from '@/lib/api/events';
import { l } from '@/lib/localized';
import type { Locale } from '@/lib/i18n/routing';
import { Link } from '@/lib/i18n/navigation';
import { cn, formatFCFA, formatLongDate } from '@/lib/utils';
import type { EventConfig, FormulaConfig } from '@/types/event-config';

import { ThemeInjector } from '@/components/shared/ThemeInjector';
import { Navbar, type NavAnchor } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CountdownBanner } from '@/components/shared/CountdownBanner';
import { TicketsCounter } from '@/components/shared/TicketsCounter';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';

/**
 * Landing événement — Server Component alimenté par GET /events/{slug}/config
 * (fixture locale si NEXT_PUBLIC_USE_MOCK=1). Les sections ci-dessous sont la
 * version « neutre » ; le Lot 2 les remplace par les sections du template
 * actif (A/B/C/D) via le registry (CONCEPTION_FRONTEND.md §4).
 */

type Params = { locale: string; slug: string };

const SOFT_BORDER = { borderColor: 'color-mix(in srgb, currentColor 15%, transparent)' };

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

export default async function EventLandingPage({ params }: { params: Params }) {
  const locale = params.locale as Locale;
  const config = await getEventConfig(params.slug);
  if (!config) notFound();

  const t = await getTranslations('landing');
  const { event, content, options, formulas, faqs, partners } = config;
  const name = l(event.name, locale);

  // Abidjan = UTC toute l'année ; si un fuseau configurable arrive dans
  // EventConfig, le calcul se fera côté backend.
  const targetIso = `${event.date}T${event.start_time}:00Z`;

  const anchors: NavAnchor[] = [
    { id: 'apropos', key: 'about' },
    { id: 'tarifs', key: 'pricing' },
    { id: 'faq', key: 'faq' },
  ];

  const showPresentielCta = event.mode !== 'online';
  const showOnlineCta = event.mode !== 'presentiel';

  return (
    <ThemeInjector design={config.design}>
      <div id="top" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar
          eventName={name}
          logoUrl={event.logo_url}
          isLive={config.is_live}
          anchors={anchors}
        />

        {/* ── Hero (photo + overlay, remplacé par le hero du template au Lot 2) ── */}
        <section className="relative flex min-h-[72vh] items-end">
          <Image
            src={content.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="container relative mx-auto px-4 pb-16 pt-36 text-white">
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              {name}
            </h1>
            <p className="mt-4 text-lg opacity-90">
              {formatLongDate(event.date, locale)} — {event.start_time}
              {(event.location || event.city) && (
                <> · {[event.location, event.city].filter(Boolean).join(', ')}</>
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {showPresentielCta && (
                <a
                  href="#tarifs"
                  className="rounded-md bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  {l(content.cta_presentiel, locale)}
                </a>
              )}
              {showOnlineCta && (
                <a
                  href="#tarifs"
                  className="rounded-md border border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  {l(content.cta_online, locale)}
                </a>
              )}
            </div>
          </div>
        </section>

        {options.show_countdown && <CountdownBanner targetIso={targetIso} />}

        {/* ── À propos ── */}
        <section id="apropos" className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-20">
          <ScrollReveal>
            <SectionTitle>{t('aboutTitle')}</SectionTitle>
            <div
              className="max-w-3xl space-y-4 text-base leading-relaxed opacity-90 [&_a]:underline"
              // HTML restreint, sanitisé côté backend (éditeur rich text admin)
              dangerouslySetInnerHTML={{ __html: l(content.description, locale) }}
            />
          </ScrollReveal>
        </section>

        {/* ── Formules ── */}
        <section id="tarifs" className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-20">
          <ScrollReveal>
            <SectionTitle>{t('pricingTitle')}</SectionTitle>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...formulas]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((formula, i) => (
                <ScrollReveal key={formula.id} delayMs={i * 100}>
                  <FormulaCardLite
                    formula={formula}
                    locale={locale}
                    slug={event.slug}
                    showCounter={options.show_tickets_counter}
                  />
                </ScrollReveal>
              ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="container mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:py-20">
          <ScrollReveal>
            <SectionTitle>{t('faqTitle')}</SectionTitle>
            <div>
              {faqs.map((faq) => (
                <details key={faq.id} className="group border-b py-4" style={SOFT_BORDER}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {l(faq.question, locale)}
                    <span
                      aria-hidden
                      className="text-xl text-[var(--color-primary)] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pt-3 text-sm leading-relaxed opacity-80">{l(faq.answer, locale)}</p>
                </details>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ── Partenaires ── */}
        {partners.length > 0 && (
          <section id="partenaires" className="container mx-auto px-4 pb-20">
            <ScrollReveal>
              <SectionTitle>{t('partnersTitle')}</SectionTitle>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
                {[...partners]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((p) => {
                    const logo = (
                      <Image
                        src={p.logo_url}
                        alt={p.name}
                        width={160}
                        height={80}
                        className="h-12 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                      />
                    );
                    return p.url ? (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer" aria-label={p.name}>
                        {logo}
                      </a>
                    ) : (
                      <span key={p.id}>{logo}</span>
                    );
                  })}
              </div>
            </ScrollReveal>
          </section>
        )}

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">{children}</h2>;
}

function FormulaCardLite({
  formula,
  locale,
  slug,
  showCounter,
}: {
  formula: FormulaConfig;
  locale: Locale;
  slug: string;
  showCounter: boolean;
}) {
  const t = useTranslations('landing');
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border p-6',
        formula.is_featured && 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]',
      )}
      style={formula.is_featured ? undefined : SOFT_BORDER}
    >
      {formula.is_featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-primary)] px-3 py-0.5 text-xs font-bold text-white">
          {t('popular')}
        </span>
      )}
      <h3 className="text-lg font-bold">{l(formula.name, locale)}</h3>
      <p className="mt-1 text-sm opacity-70">{l(formula.description, locale)}</p>
      <div className="mt-4 text-3xl font-bold">{formatFCFA(formula.price)}</div>
      {showCounter && <TicketsCounter remaining={formula.remaining} className="mt-1" />}
      <ul className="mt-4 space-y-2 text-sm">
        {formula.advantages.map((advantage, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-[var(--color-primary)]">
              •
            </span>
            <span className="opacity-90">{l(advantage, locale)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        {formula.is_sold_out ? (
          <div
            className="cursor-not-allowed rounded-md border py-2.5 text-center font-semibold opacity-50"
            style={SOFT_BORDER}
          >
            {t('soldOut')}
          </div>
        ) : (
          <Link
            href={`/e/${slug}/acheter?formula=${formula.id}`}
            className="block rounded-md bg-[var(--color-primary)] py-2.5 text-center font-semibold text-white transition hover:opacity-90"
          >
            {t('choose')}
          </Link>
        )}
      </div>
    </div>
  );
}
