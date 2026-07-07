'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Partner } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

/**
 * Partenaires KEYNOTE : logos centrés en niveaux de gris, couleur au hover.
 * Au-delà de 6 logos : défilement marquee lent (pause au survol, désactivé
 * si prefers-reduced-motion).
 */
export function KeynotePartners({ config }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const partners = [...config.partners].sort((a, b) => a.sort_order - b.sort_order);
  const marquee = partners.length > 6;

  return (
    <section id={SECTION_IDS.partners} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('partnersTitle')} />
      {marquee ? (
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-16 hover:[animation-play-state:paused] motion-reduce:animate-none">
            <LogoRow partners={partners} />
            <LogoRow partners={partners} ariaHidden />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          <LogoRow partners={partners} />
        </div>
      )}
    </section>
  );
}

function LogoRow({ partners, ariaHidden = false }: { partners: Partner[]; ariaHidden?: boolean }) {
  return (
    <>
      {partners.map((partner) => {
        const logo = (
          <Image
            src={partner.logo_url}
            alt={ariaHidden ? '' : partner.name}
            width={160}
            height={80}
            className="h-10 w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-12"
          />
        );
        return partner.url && !ariaHidden ? (
          <a
            key={partner.id}
            href={partner.url}
            target="_blank"
            rel="noreferrer"
            aria-label={partner.name}
          >
            {logo}
          </a>
        ) : (
          <span key={partner.id} aria-hidden={ariaHidden || undefined}>
            {logo}
          </span>
        );
      })}
    </>
  );
}
