'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';

/** Stats DIRECTOR'S CUT : chiffres serif géants sur noir, compteur animé. */
export function DirectorsCutStats({ config, locale }: TemplateSectionProps) {
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
    <section className="bg-black px-4 py-24 text-white sm:py-32">
      <div ref={ref} className="container mx-auto flex flex-col items-center justify-around gap-16 text-center sm:flex-row">
        {config.stats.map((s, i) => (
          <div key={i}>
            <CountUp value={s.value} suffix={s.suffix} started={started} animate={animate} format={(n) => fmt.format(n)} />
            <p className="mt-4 text-sm uppercase tracking-[0.25em] text-white/50">{l(s.label, locale)}</p>
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
    <p className="font-serif text-7xl leading-none tracking-tight sm:text-8xl lg:text-9xl">
      {format(display)}
      {suffix ?? ''}
    </p>
  );
}
