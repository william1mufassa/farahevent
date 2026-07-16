'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import { formatLongDate } from '@/lib/utils';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { RevealWords } from './RevealWords';
import { MarqueeBand } from './MarqueeBand';
import { CustomCursor } from './CustomCursor';
import { ThreeDTilt } from '@/components/ui/ThreeDTilt';
import { SpotlightGlow } from '@/components/ui/SpotlightGlow';

/** Hero PULSE : titre display massif (mots au scroll), badge date, marquee, curseur. */
export function PulseHero({ config, locale }: TemplateSectionProps) {
  const { event, content, options } = config;
  const name = l(event.name, locale);
  const showPresentiel = event.mode !== 'online';
  const showOnline = event.mode !== 'presentiel';
  const place = [event.location, event.city].filter(Boolean).join(', ');

  return (
    <>
      <CustomCursor />
      <section className="relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="container mx-auto grid gap-8 px-4 pb-16 pt-32 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:pt-40">
          <div>
            <div className="mb-6 inline-block bg-[var(--color-primary)] px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-md shadow-[var(--color-primary)]/10">
              {formatLongDate(event.date, locale)}
            </div>
            
            <h1 className="font-display text-[clamp(2.75rem,10vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-tight">
              <RevealWords text={name} />
            </h1>
            
            {place && (
              <p className="mt-6 text-lg font-medium opacity-70">
                {place} · {event.start_time}
              </p>
            )}
            
            <div className="mt-10 flex flex-wrap gap-4">
              {showPresentiel && (
                <div data-cursor="go">
                  <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_presentiel, locale)} />
                </div>
              )}
              {showOnline && (
                <div data-cursor="go">
                  <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_online, locale)} outline />
                </div>
              )}
            </div>
          </div>
          
          <div className="relative hidden aspect-[4/5] overflow-hidden lg:block">
            <ThreeDTilt maxTilt={20} className="w-full h-full">
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10" data-cursor="view">
                {content.hero_video_url ? (
                  <video
                    src={content.hero_video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <Image src={content.hero_image_url} alt="" fill sizes="40vw" className="object-cover transition-transform duration-500 hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-[var(--color-primary)] opacity-10 mix-blend-multiply pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
              </div>
            </ThreeDTilt>
          </div>
        </div>
      </section>
      {options.marquee_text && <MarqueeBand text={options.marquee_text} locale={locale} />}
    </>
  );
}

function HeroCta({ href, label, outline = false }: { href: string; label: string; outline?: boolean }) {
  return (
    <SpotlightGlow glowColor={outline ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.25)'}>
      <a
        href={href}
        className={cn(
          'inline-flex items-center gap-2 px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide transition-all duration-300 rounded-xl',
          outline
            ? 'border-2 border-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]'
            : 'bg-[var(--color-primary)] text-white hover:shadow-lg hover:shadow-[var(--color-primary)]/20',
        )}
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
    </SpotlightGlow>
  );
}
