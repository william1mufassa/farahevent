'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { l } from '@/lib/localized';
import { formatLongDate } from '@/lib/utils';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { loadGsap } from '@/lib/motion/gsap';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { Grain } from './Grain';
import { SpotlightGlow } from '@/components/ui/SpotlightGlow';

/**
 * Hero DIRECTOR'S CUT : photo noir & blanc en parallaxe (GSAP, profil 'full'),
 * dégradé fade-to-black, titre serif surdimensionné, grain cinématographique.
 */
export function DirectorsCutHero({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const { event, content } = config;
  const name = l(event.name, locale);
  const showPresentiel = event.mode !== 'online';
  const showOnline = event.mode !== 'presentiel';
  const place = [event.location, event.city].filter(Boolean).join(', ');

  const profile = useMotionProfile();
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile !== 'full' || !sectionRef.current || !imgRef.current) return;
    let ctx: { revert: () => void } | undefined;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      ctx = gsap.context(() => {
        gsap.to(imgRef.current, {
          yPercent: 16,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      }, sectionRef);
      ScrollTrigger.refresh();
    });
    return () => ctx?.revert();
  }, [profile]);

  // Title character animation variants
  const words = name.split(' ');
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 40, skewY: 3 },
    visible: { 
      opacity: 1, 
      y: 0, 
      skewY: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
    },
  };

  return (
    <section ref={sectionRef} className="relative flex min-h-screen items-end overflow-hidden bg-black text-white">
      <Grain />
      
      <div ref={imgRef} className="absolute inset-x-0 top-0 h-[116%]">
        {content.hero_video_url ? (
          <video
            src={content.hero_video_url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover [filter:grayscale(100%)_contrast(1.1)_brightness(0.55)]"
          />
        ) : (
          <Image
            src={content.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover [filter:grayscale(100%)_contrast(1.1)_brightness(0.55)]"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black" />

      <div className="container relative mx-auto px-4 pb-24 pt-40 z-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 1 }}
          className="mb-6 text-xs uppercase tracking-[0.4em] text-white/70"
        >
          {formatLongDate(event.date, locale)}
          {place && ` — ${place}`}
        </motion.p>
        
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl font-serif text-[clamp(3rem,11vw,9rem)] font-medium leading-[0.85] tracking-[-0.04em]"
        >
          {words.map((word, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-5 origin-left">
              {word}
            </motion.span>
          ))}
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          {showPresentiel && <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_presentiel, locale)} />}
          {showOnline && <HeroCta href={`#${SECTION_IDS.pricing}`} label={l(content.cta_online, locale)} />}
        </motion.div>
      </div>

      <motion.a
        href={`#${SECTION_IDS.about}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/60 transition hover:text-white z-10"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('discover')}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </motion.a>
    </section>
  );
}

function HeroCta({ href, label }: { href: string; label: string }) {
  return (
    <SpotlightGlow glowColor="rgba(255, 255, 255, 0.15)">
      <a
        href={href}
        className="border border-white/40 px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black rounded-lg backdrop-blur-sm"
      >
        {label}
      </a>
    </SpotlightGlow>
  );
}
