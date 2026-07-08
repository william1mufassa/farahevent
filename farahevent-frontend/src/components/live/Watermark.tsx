'use client';

import { useEffect, useState } from 'react';

/**
 * Filigrane anti-capture (CONCEPTION_FRONTEND.md §9) : nom + email du viewer,
 * non cliquable, repositionné toutes les 30 s à une position pseudo-aléatoire
 * bornée dans le cadre du player.
 */
export function Watermark({ name, email }: { name: string; email: string }) {
  const [pos, setPos] = useState<{ top: string; left: string }>({ top: '10%', left: '8%' });

  useEffect(() => {
    const move = () =>
      setPos({
        top: `${5 + Math.random() * 80}%`,
        left: `${5 + Math.random() * 65}%`,
      });
    move();
    const id = setInterval(move, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 select-none text-[11px] font-medium leading-tight text-white/45 transition-all duration-1000 ease-in-out [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
      style={pos}
    >
      <div>{name}</div>
      <div className="text-white/30">{email}</div>
    </div>
  );
}
