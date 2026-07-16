'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

interface SpotlightGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. "rgba(99, 102, 241, 0.15)"
}

export function SpotlightGlow({ children, className = '', glowColor = 'rgba(99, 102, 241, 0.15)' }: SpotlightGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}
