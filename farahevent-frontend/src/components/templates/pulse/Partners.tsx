import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** Partenaires PULSE : grille de logos, couleur au survol. */
export function PulsePartners({ config }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const partners = [...config.partners].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.partners} className="scroll-mt-20 bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-24">
      <div className="container mx-auto">
        <SectionTitle title={t('partnersTitle')} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {partners.map((p) => (
            <div
              key={p.id}
              className="flex aspect-[3/2] items-center justify-center border-2 border-[var(--color-text)]/10 p-6 transition-colors hover:border-[var(--color-primary)]"
            >
              <Image
                src={p.logo_url}
                alt={p.name}
                width={160}
                height={80}
                className="h-10 w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-12"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
