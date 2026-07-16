'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useMotionProfile } from '@/lib/motion/useMotionProfile';

/**
 * Curseur d'accompagnement PULSE (desktop pointeur fin uniquement, profil
 * 'full'). Point qui suit la souris en douceur, fusion 'difference'. Le curseur
 * natif reste visible (accessibilité).
 */
export function CustomCursor() {
  const profile = useMotionProfile();
  const [enabled, setEnabled] = useState(false);
  const [cursorType, setCursorType] = useState<string>('default');

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { stiffness: 400, damping: 28 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => setEnabled(profile === 'full'), [profile]);

  useEffect(() => {
    if (!enabled) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const element = target.closest('[data-cursor]') as HTMLElement | null;
      if (element) {
        const type = element.getAttribute('data-cursor');
        setCursorType(type || 'default');
      } else {
        setCursorType('default');
      }
    };

    window.addEventListener('mousemove', moveCursor);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [enabled, cursorX, cursorY]);

  if (!enabled) return null;

  // Custom styling states
  const size = cursorType === 'default' ? 20 : 64;
  const label = 
    cursorType === 'view' ? 'VOIR' :
    cursorType === 'go' ? 'GO' :
    cursorType === 'left' ? '←' :
    cursorType === 'right' ? '→' : '';

  return (
    <motion.div
      style={{
        translateX: cursorXSpring,
        translateY: cursorYSpring,
        x: '-50%',
        y: '-50%',
        width: size,
        height: size,
      }}
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-extrabold uppercase tracking-wider text-white mix-blend-difference transition-all duration-200"
    >
      {label}
    </motion.div>
  );
}
