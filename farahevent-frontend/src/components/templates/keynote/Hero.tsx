import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { l } from '@/lib/localized';
import { formatLongDate } from '@/lib/utils';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';

/**
 * Hero KEYNOTE (CDC §2.1) : photo plein écran traitée en monochrome léger,
 * overlay noir 40 %, titre serif centré à espacement large, date · lieu ·
 * heure en petites capitales, CTAs outline→fill, indicateur de scroll.
 */
export function KeynoteHero({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const { event, content } = config;
  const name = l(event.name, locale);
  const showPresentiel = event.mode !== 'online';
  const showOnline = event.mode !== 'presentiel';
  const place = [event.location, event.city].filter(Boolean).join(', ');

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <Image
        src={content.hero_image_url}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover [filter:grayscale(30%)_contrast(1.05)]"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="container relative mx-auto px-4 py-32 text-center text-white">
        <h1 className="mx-auto max-w-5xl font-serif text-[2.6rem] leading-tight tracking-[0.05em] sm:text-6xl lg:text-7xl">
          {name}
        </h1>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.3em] opacity-90 sm:text-sm">
          <span>{formatLongDate(event.date, locale)}</span>
          {place && (
            <>
              <span aria-hidden>·</span>
              <span>{place}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{event.start_time}</span>
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          {showPresentiel && (
            <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_presentiel, locale)} />
          )}
          {showOnline && (
            <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_online, locale)} />
          )}
        </div>
      </div>

      <a
        href={`#${SECTION_IDS.about}`}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/80 transition hover:text-white"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('discover')}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}

function HeroCta({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="border border-[var(--color-primary)] px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
    >
      {label}
    </a>
  );
}
