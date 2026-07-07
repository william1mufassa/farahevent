'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';
import { cn } from '@/lib/utils';

/**
 * Signature KEYNOTE : ligne horizontale fine qui s'étire de gauche à droite
 * quand elle entre dans le viewport. Statique en profil 'minimal'.
 */
export function Rule({ className }: { className?: string }) {
  const profile = useMotionProfile();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (profile === 'minimal') {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [profile]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'h-px w-full origin-left bg-current opacity-20 transition-transform duration-1000 ease-out',
        visible ? 'scale-x-100' : 'scale-x-0',
        className,
      )}
    />
  );
}
