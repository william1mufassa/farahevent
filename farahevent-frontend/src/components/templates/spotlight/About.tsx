import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

export function SpotlightAbout({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const tagline = l(config.content.tagline, locale);

  return (
    <section id={SECTION_IDS.about} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('aboutTitle')} />

      <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
        {tagline && (
          <ScrollReveal className="lg:col-span-2">
            <blockquote className="border-l-4 border-[var(--color-primary)] pl-6 font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {tagline}
            </blockquote>
          </ScrollReveal>
        )}

        <ScrollReveal className={tagline ? 'lg:col-span-3' : 'lg:col-span-5 mx-auto max-w-3xl'}>
          <div
            className="space-y-4 text-base leading-relaxed opacity-85 [&_a]:text-[var(--color-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: l(config.content.description, locale) }}
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
