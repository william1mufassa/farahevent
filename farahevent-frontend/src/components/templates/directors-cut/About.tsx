import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import { sanitizeRichText } from '@/lib/sanitize';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';
import { TeaserPlayer } from '@/components/shared/TeaserPlayer';

/** À propos DIRECTOR'S CUT : texte sobre + citation de respiration (tagline). */
export function DirectorsCutAbout({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const tagline = config.content.tagline ? l(config.content.tagline, locale) : '';

  return (
    <section id={SECTION_IDS.about} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-32">
      <div className="container mx-auto">
        <SectionTitle title={t('aboutTitle')} />
        <ScrollReveal>
          <div className="space-y-6">
            <div
              className="max-w-2xl space-y-5 text-lg leading-relaxed text-white/70 [&_a]:text-[var(--color-primary)] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(l(config.content.description, locale)) }}
            />
            <TeaserPlayer url={config.content.teaser_video_url} />
          </div>
        </ScrollReveal>
        {tagline && (
          <ScrollReveal>
            <blockquote className="mx-auto mt-20 max-w-4xl text-center font-serif text-[clamp(1.75rem,4.5vw,3.25rem)] font-medium italic leading-[1.15] tracking-tight">
              « {tagline} »
            </blockquote>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
