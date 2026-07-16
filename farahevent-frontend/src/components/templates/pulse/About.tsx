import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import { sanitizeRichText } from '@/lib/sanitize';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';
import { TeaserPlayer } from '@/components/shared/TeaserPlayer';

/** À propos PULSE : accroche display + texte haute lisibilité. */
export function PulseAbout({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const tagline = config.content.tagline ? l(config.content.tagline, locale) : '';

  return (
    <section id={SECTION_IDS.about} className="scroll-mt-20 bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-28">
      <div className="container mx-auto">
        <SectionTitle title={t('aboutTitle')} />
        <div className="grid gap-10 lg:grid-cols-2">
          {tagline && (
            <ScrollReveal>
              <p className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                {tagline}
              </p>
            </ScrollReveal>
          )}
          <ScrollReveal>
            <div className="space-y-6">
              <div
                className="space-y-4 text-base leading-relaxed opacity-80 [&_a]:text-[var(--color-primary)] [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(l(config.content.description, locale)) }}
              />
              <TeaserPlayer url={config.content.teaser_video_url} />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
