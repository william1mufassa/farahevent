'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { loadGsap } from '@/lib/motion/gsap';

/**
 * Titre PULSE : chaque mot monte derrière un masque au scroll (GSAP, profil
 * 'full'). Sans JS / hors 'full', les mots sont simplement visibles (SSR-safe).
 */
export function RevealWords({ text, className }: { text: string; className?: string }) {
  const profile = useMotionProfile();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (profile !== 'full' || !ref.current) return;
    let ctx: { revert: () => void } | undefined;
    loadGsap().then(({ gsap }) => {
      ctx = gsap.context(() => {
        gsap.from('[data-word]', {
          yPercent: 115,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.07,
          scrollTrigger: { trigger: ref.current, start: 'top 82%' },
        });
      }, ref);
    });
    return () => ctx?.revert();
  }, [profile]);

  const words = text.split(' ');
  return (
    <span ref={ref} className={cn('inline-block', className)}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span data-word className="inline-block">
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </span>
  );
}
