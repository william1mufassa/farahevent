'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
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

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const scale = useTransform(scrollY, [0, 500], [1.02, 1.15]);

  // Staggered letters variants
  const titleWords = name.split(' ');
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
  };

  return (
    <section ref={sectionRef} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <motion.div style={{ y, scale }} className="absolute inset-0 h-full w-full">
        {content.hero_video_url ? (
          <video
            src={content.hero_video_url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover [filter:grayscale(30%)_contrast(1.05)]"
          />
        ) : (
          <Image
            src={content.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover [filter:grayscale(30%)_contrast(1.05)]"
          />
        )}
      </motion.div>
      <div className="absolute inset-0 bg-black/50" />

      <div className="container relative mx-auto px-4 py-32 text-center text-white z-10">
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-5xl font-serif text-[2.6rem] leading-tight tracking-[0.05em] sm:text-6xl lg:text-7xl"
        >
          {titleWords.map((word, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-4">
              {word}
            </motion.span>
          ))}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.3em] opacity-90 sm:text-sm"
        >
          <span>{formatLongDate(event.date, locale)}</span>
          {place && (
            <>
              <span aria-hidden>·</span>
              <span>{place}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{event.start_time}</span>
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          {showPresentiel && (
            <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_presentiel, locale)} />
          )}
          {showOnline && (
            <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_online, locale)} />
          )}
        </motion.div>
      </div>

      <motion.a
        href={`#${SECTION_IDS.about}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/80 transition hover:text-white z-10"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('discover')}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </motion.a>
    </section>
  );
}

function HeroCta({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="border border-[var(--color-primary)] px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)] transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-white rounded-lg backdrop-blur-sm"
    >
      {label}
    </a>
  );
}
