'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface ThreeDTiltProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function ThreeDTilt({ children, className = '', maxTilt = 15 }: ThreeDTiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-maxTilt, maxTilt]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normalize values between 0 and 1
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
