import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** Partenaires DIRECTOR'S CUT : logos en niveaux de gris sur noir. */
export function DirectorsCutPartners({ config }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const partners = [...config.partners].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.partners} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-28">
      <div className="container mx-auto">
        <SectionTitle title={t('partnersTitle')} />
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-10">
          {partners.map((p) => (
            <Image
              key={p.id}
              src={p.logo_url}
              alt={p.name}
              width={160}
              height={80}
              className="h-10 w-auto object-contain opacity-50 grayscale transition duration-300 hover:opacity-100 sm:h-12"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
