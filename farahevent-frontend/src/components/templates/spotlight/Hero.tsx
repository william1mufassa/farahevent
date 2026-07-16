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
import { ThreeDTilt } from '@/components/ui/ThreeDTilt';
import { SpotlightGlow } from '@/components/ui/SpotlightGlow';

export function SpotlightHero({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const { event, content } = config;
  const name = l(event.name, locale);
  const showPresentiel = event.mode !== 'online';
  const showOnline = event.mode !== 'presentiel';
  const place = [event.location, event.city].filter(Boolean).join(', ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 15 } },
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[var(--color-text)]">
      <div className="absolute inset-0">
        {content.hero_video_url ? (
          <video
            src={content.hero_video_url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover opacity-30"
          />
        ) : (
          <Image
            src={content.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
        )}
      </div>

      <div className="container relative mx-auto grid min-h-screen items-center gap-8 px-4 py-24 lg:grid-cols-2 lg:gap-16 z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-white"
        >
          <motion.div
            variants={itemVariants}
            className="mb-6 inline-block rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-md shadow-[var(--color-primary)]/10"
          >
            {formatLongDate(event.date, locale)}
          </motion.div>
          
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            {name}
          </motion.h1>
          
          {place && (
            <motion.p
              variants={itemVariants}
              className="mt-4 text-lg text-white/70"
            >
              {place} · {event.start_time}
            </motion.p>
          )}
          
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-wrap gap-4"
          >
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
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 2 }}
          transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.3 }}
          className="hidden lg:block"
        >
          <ThreeDTilt maxTilt={25} className="w-full">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-sm bg-white/5">
              <Image
                src={content.hero_image_url}
                alt=""
                fill
                sizes="50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              {/* Gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
            </div>
          </ThreeDTilt>
        </motion.div>
      </div>

      <motion.a
        href={`#${SECTION_IDS.about}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        {t('discover')}
        <ArrowRight className="h-4 w-4" />
      </motion.a>
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
    <SpotlightGlow glowColor={outline ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}>
      <a
        href={href}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-300',
          outline
            ? 'border border-white/30 text-white hover:bg-white/15'
            : 'bg-[var(--color-primary)] text-white hover:shadow-lg hover:shadow-[var(--color-primary)]/20',
        )}
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
    </SpotlightGlow>
  );
}
