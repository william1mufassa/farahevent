'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { cn } from '@/lib/utils';

/**
 * Apparition douce au scroll (fondu + translateY) via IntersectionObserver.
 * SSR rend le contenu visible (pas de page vide sans JS) ; l'élément n'est
 * masqué qu'après montage, et uniquement s'il est sous le viewport et que
 * le profil motion l'autorise (profil 'minimal' → aucun effet).
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const profile = useMotionProfile();
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(true);
  const armedRef = useRef(false);

  useEffect(() => {
    if (profile === 'minimal' || armedRef.current) return;
    const el = ref.current;
    if (!el) return;

    // Déjà (partiellement) visible : ne pas masquer, éviter tout flash.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    armedRef.current = true;
    setRevealed(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [profile]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
