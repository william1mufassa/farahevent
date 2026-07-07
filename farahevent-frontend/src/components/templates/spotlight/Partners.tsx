'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import type { Partner } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

export function SpotlightPartners({ config }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const partners = [...config.partners].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.partners} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('partnersTitle')} />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {partners.map((partner, i) => (
          <ScrollReveal key={partner.id} delayMs={i * 80}>
            <PartnerCard partner={partner} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const inner = (
    <div className="flex aspect-[3/2] items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.01] p-6 transition hover:shadow-md">
      <Image
        src={partner.logo_url}
        alt={partner.name}
        width={160}
        height={80}
        className="h-10 w-auto object-contain opacity-50 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-12"
      />
    </div>
  );

  return partner.url ? (
    <a href={partner.url} target="_blank" rel="noreferrer" aria-label={partner.name}>
      {inner}
    </a>
  ) : (
    inner
  );
}
