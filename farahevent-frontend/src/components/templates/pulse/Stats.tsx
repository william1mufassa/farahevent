'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';

/** Stats PULSE : chiffres display géants dans des blocs, compteur animé. */
export function PulseStats({ config, locale }: TemplateSectionProps) {
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
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animate]);

  const fmt = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR');

  return (
    <section className="bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-28">
      <div ref={ref} className="container mx-auto grid grid-cols-2 gap-4 lg:grid-cols-4">
        {config.stats.map((s, i) => (
          <div key={i} className="border-2 border-[var(--color-text)]/15 p-6 text-center">
            <CountUp value={s.value} suffix={s.suffix} started={started} animate={animate} format={(n) => fmt.format(n)} />
            <p className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">{l(s.label, locale)}</p>
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
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!started) return;
    if (!animate) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, animate, value]);

  return (
    <p className="font-display text-4xl font-extrabold tabular-nums text-[var(--color-primary)] sm:text-5xl">
      {format(display)}
      {suffix ?? ''}
    </p>
  );
}
