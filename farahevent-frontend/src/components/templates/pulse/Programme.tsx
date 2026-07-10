'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { loadGsap } from '@/lib/motion/gsap';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { RevealWords } from './RevealWords';

/**
 * Programme PULSE : scroll horizontal épinglé (GSAP pin+scrub, profil 'full') ;
 * défilement tactile natif sinon. Bloc inversé (texte clair sur fond sombre).
 */
export function PulseProgramme({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const profile = useMotionProfile();
  const sessions = [...config.programme].sort((a, b) => a.sort_order - b.sort_order);
  const speakerById = new Map(config.speakers.map((s) => [s.id, s.name]));
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const horizontal = profile !== 'full';

  useEffect(() => {
    if (profile !== 'full' || !sectionRef.current || !trackRef.current) return;
    let ctx: { revert: () => void } | undefined;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      ctx = gsap.context(() => {
        const track = trackRef.current;
        if (!track) return;
        const distance = track.scrollWidth - window.innerWidth + 32;
        if (distance <= 0) return;
        gsap.to(track, {
          x: -distance,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, pin: true, scrub: 1, end: () => `+=${distance}` },
        });
      }, sectionRef);
      ScrollTrigger.refresh();
    });
    return () => ctx?.revert();
  }, [profile]);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.programme}
      className="scroll-mt-20 overflow-hidden bg-[var(--color-text)] py-20 text-[var(--color-bg)] sm:py-28"
    >
      <div className="container mx-auto px-4">
        <RevealWords
          text={t('programmeTitle')}
          className="mb-10 font-display text-[clamp(2.25rem,7vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-[var(--color-bg)]"
        />
      </div>
      <div className={cn(horizontal && 'overflow-x-auto')}>
        <div
          ref={trackRef}
          className="flex gap-5 px-4"
          style={{ width: profile === 'full' ? 'max-content' : undefined }}
        >
          {sessions.map((session, i) => {
            const names = session.speaker_ids
              .map((id) => speakerById.get(id))
              .filter((n): n is string => Boolean(n));
            const desc = l(session.description, locale);
            return (
              <div
                key={session.id}
                className="flex w-[78vw] shrink-0 flex-col border-2 border-[var(--color-bg)]/20 p-6 sm:w-[380px]"
              >
                <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--color-primary)]">
                  {session.start_time}
                </span>
                <h3 className="mt-3 font-display text-xl font-extrabold uppercase leading-tight tracking-tight">
                  {l(session.title, locale)}
                </h3>
                {desc && <p className="mt-2 text-sm leading-relaxed opacity-70">{desc}</p>}
                {names.length > 0 && (
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide opacity-60">{names.join(', ')}</p>
                )}
                <span className="mt-auto pt-4 text-xs opacity-40">
                  {i + 1} / {sessions.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
