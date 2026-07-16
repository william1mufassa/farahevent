'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ThreeDTilt } from '@/components/ui/ThreeDTilt';
import { SpotlightGlow } from '@/components/ui/SpotlightGlow';
import type { FormulaConfig } from '@/types/event-config';

interface Ticket3DPreviewProps {
  firstName: string;
  lastName: string;
  formula: FormulaConfig | null;
  eventName: string;
  eventDate: string;
  locale: string;
}

export function Ticket3DPreview({
  firstName,
  lastName,
  formula,
  eventName,
  eventDate,
  locale,
}: Ticket3DPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'VOTRE NOM';
  const formulaName = formula ? (formula.name[locale as 'fr' | 'en'] || formula.name.fr || '') : '';
  const isVip = formulaName.toLowerCase().includes('vip');

  const cardBgClass = isVip
    ? 'bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border-amber-500/30'
    : 'bg-gradient-to-br from-indigo-500/20 via-zinc-900 to-zinc-950 border-indigo-500/30';

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[1.6/1] sm:aspect-[1.5/1] cursor-pointer perspective-[1200px]" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full relative"
      >
        {/* Front Side */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 w-full h-full"
        >
          <ThreeDTilt maxTilt={12} className="w-full h-full">
            <SpotlightGlow
              glowColor={isVip ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)'}
              className={`w-full h-full rounded-2xl border backdrop-blur-md p-6 flex flex-col justify-between text-white shadow-2xl ${cardBgClass}`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-50">FARAH EVENT</span>
                  <h3 className="text-sm font-semibold truncate max-w-[200px]">{eventName}</h3>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                  isVip ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-indigo-500 text-white'
                }`}>
                  {formula ? formulaName : 'BILLET'}
                </div>
              </div>

              {/* Middle Row */}
              <div className="my-4">
                <span className="text-[9px] uppercase tracking-wider opacity-40">PARTICIPANT</span>
                <p className="text-lg font-bold tracking-wide uppercase truncate">
                  {fullName}
                </p>
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-end border-t border-white/10 pt-4">
                <div>
                  <span className="text-[8px] uppercase tracking-wider opacity-40 block">DATE ET HEURE</span>
                  <span className="text-xs opacity-90">{eventDate}</span>
                </div>
                {/* Fake Barcode SVG */}
                <div className="bg-white/95 p-1 rounded-sm flex items-center justify-center shrink-0">
                  <svg className="w-20 h-8 text-black" viewBox="0 0 100 40">
                    <rect width="2" height="40" x="5" />
                    <rect width="1" height="40" x="9" />
                    <rect width="4" height="40" x="12" />
                    <rect width="2" height="40" x="18" />
                    <rect width="1" height="40" x="22" />
                    <rect width="3" height="40" x="25" />
                    <rect width="1" height="40" x="30" />
                    <rect width="4" height="40" x="33" />
                    <rect width="2" height="40" x="39" />
                    <rect width="1" height="40" x="43" />
                    <rect width="3" height="40" x="46" />
                    <rect width="1" height="40" x="51" />
                    <rect width="4" height="40" x="54" />
                    <rect width="2" height="40" x="60" />
                    <rect width="1" height="40" x="64" />
                    <rect width="3" height="40" x="67" />
                    <rect width="1" height="40" x="72" />
                    <rect width="4" height="40" x="75" />
                    <rect width="2" height="40" x="81" />
                    <rect width="1" height="40" x="85" />
                    <rect width="3" height="40" x="88" />
                  </svg>
                </div>
              </div>
            </SpotlightGlow>
          </ThreeDTilt>
        </div>

        {/* Back Side */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 w-full h-full"
        >
          <ThreeDTilt maxTilt={12} className="w-full h-full">
            <SpotlightGlow
              glowColor="rgba(255, 255, 255, 0.1)"
              className={`w-full h-full rounded-2xl border backdrop-blur-md p-6 flex flex-col justify-between text-white/80 shadow-2xl ${cardBgClass}`}
            >
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">{"Instructions d'accès"}</h4>
                <ul className="text-[10px] space-y-1.5 opacity-80 list-disc list-inside">
                  <li>{"Présentez ce code QR lors de votre arrivée"}</li>
                  <li>{"Le billet est nominatif et non transférable"}</li>
                  <li>{"Une pièce d'identité peut être demandée"}</li>
                  <li>{"Des questions ? Contactez support@farahevent.tech"}</li>
                </ul>
              </div>
              <div className="flex justify-between items-center text-[9px] opacity-40 border-t border-white/10 pt-4">
                <span>SECURE PASS v2.0</span>
                <span>CLIQUEZ POUR RETOURNER</span>
              </div>
            </SpotlightGlow>
          </ThreeDTilt>
        </div>
      </motion.div>
    </div>
  );
}
