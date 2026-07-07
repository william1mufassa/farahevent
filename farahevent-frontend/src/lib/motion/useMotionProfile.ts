'use client';

import { useEffect, useState } from 'react';

/**
 * Profil d'animation selon l'appareil (CDC §1.6 — progressive enhancement) :
 * - 'minimal' : prefers-reduced-motion, ou mobile (<768px) — contenu statique
 * - 'reduced' : tablette / pointeur tactile — fondus simples, swipe natif
 * - 'full'    : desktop pointeur fin — GSAP, curseur custom, scroll horizontal
 *
 * SSR-safe : rend 'minimal' côté serveur et au premier paint ; les animations
 * sont des enhancements attachés après montage (jamais de mismatch d'hydratation).
 */
export type MotionProfile = 'full' | 'reduced' | 'minimal';

export function computeMotionProfile(): MotionProfile {
  if (typeof window === 'undefined') return 'minimal';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'minimal';
  if (window.innerWidth < 768) return 'minimal';
  const coarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (coarse || window.innerWidth < 1024) return 'reduced';
  return 'full';
}

export function useMotionProfile(): MotionProfile {
  const [profile, setProfile] = useState<MotionProfile>('minimal');

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setProfile(computeMotionProfile()));
    };

    update();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', update);
    reducedMotion.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      reducedMotion.removeEventListener('change', update);
    };
  }, []);

  return profile;
}
