'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { Accent } from './Accent';

export function SpotlightStats({ config, locale }: TemplateSectionProps) {
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
    <section className="bg-[var(--color-text)] px-4 py-16 text-[var(--color-bg)] sm:py-24">
      <div className="container mx-auto">
        <div
          ref={ref}
          className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4"
        >
          {config.stats.map((stat, i) => (
            <ScrollReveal key={i} delayMs={i * 120}>
              <div className="rounded-2xl bg-white/[0.06] p-6 text-center">
                <CountUp
                  value={stat.value}
                  suffix={stat.suffix}
                  started={started}
                  animate={animate}
                  format={(n) => formatter.format(n)}
                />
                <Accent className="mx-auto mt-3" />
                <p className="mt-3 text-sm font-medium opacity-70">
                  {l(stat.label, locale)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
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
    <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
      {format(display)}
      {suffix ?? ''}
    </p>
  );
}
