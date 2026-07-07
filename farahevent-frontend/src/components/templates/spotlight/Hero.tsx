import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import { formatLongDate } from '@/lib/utils';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';

export function SpotlightHero({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const { event, content } = config;
  const name = l(event.name, locale);
  const showPresentiel = event.mode !== 'online';
  const showOnline = event.mode !== 'presentiel';
  const place = [event.location, event.city].filter(Boolean).join(', ');

  return (
    <section className="relative min-h-screen overflow-hidden bg-[var(--color-text)]">
      <div className="absolute inset-0">
        <Image
          src={content.hero_image_url}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
      </div>

      <div className="container relative mx-auto grid min-h-screen items-center gap-8 px-4 py-24 lg:grid-cols-2 lg:gap-16">
        <div className="text-white">
          <div className="mb-6 inline-block rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
            {formatLongDate(event.date, locale)}
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {name}
          </h1>
          {place && (
            <p className="mt-4 text-lg text-white/70">{place} · {event.start_time}</p>
          )}
          <div className="mt-10 flex flex-wrap gap-4">
            {showPresentiel && (
              <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_presentiel, locale)} />
            )}
            {showOnline && (
              <HeroCta
                href={`#${SECTION_IDS.pricing}`}
                label={l(content.cta_online, locale)}
                outline
              />
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl">
            <Image
              src={content.hero_image_url}
              alt=""
              fill
              sizes="50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <a
        href={`#${SECTION_IDS.about}`}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        {t('discover')}
        <ArrowRight className="h-4 w-4" />
      </a>
    </section>
  );
}

function HeroCta({
  href,
  label,
  outline = false,
}: {
  href: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition',
        outline
          ? 'border border-white/40 text-white hover:bg-white/10'
          : 'bg-[var(--color-primary)] text-white hover:opacity-90',
      )}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}
