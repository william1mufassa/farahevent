'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { Rule } from './Rule';

/**
 * Stats KEYNOTE : chiffres clés en très grande typographie serif, compteur
 * animé 0→valeur quand la section entre dans le viewport (statique en
 * profil 'minimal').
 */
export function KeynoteStats({ config, locale }: TemplateSectionProps) {
  const profile = useMotionProfile();
  const animate = profile !== 'minimal';
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!animate) {
      setStarted(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR');

  return (
    <section className="container mx-auto px-4 py-16 sm:py-24">
      <Rule className="mb-16" />
      <div
        ref={ref}
        className="flex flex-col items-center justify-around gap-12 text-center sm:flex-row"
      >
        {config.stats.map((stat, i) => (
          <div key={i}>
            <CountUp
              value={stat.value}
              suffix={stat.suffix}
              started={started}
              animate={animate}
              format={(n) => formatter.format(n)}
            />
            <p className="mt-3 text-sm uppercase tracking-[0.2em] opacity-60">
              {l(stat.label, locale)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountUp({
  value,
  suffix,
  started,
  animate,
  format,
}: {
  value: number;
  suffix: string | null;
  started: boolean;
  animate: boolean;
  format: (n: number) => string;
}) {
  // Avant montage (SSR + 1er rendu), profil 'minimal' → valeur finale affichée.
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!started) return;
    if (!animate) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, animate, value]);

  return (
    <p className="font-serif text-7xl leading-none tracking-tight sm:text-8xl lg:text-9xl">
      {format(display)}
      {suffix ?? ''}
    </p>
  );
}
