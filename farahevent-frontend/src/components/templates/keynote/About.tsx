import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import { sanitizeRichText } from '@/lib/sanitize';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { KeynoteSection } from './KeynoteSection';
import { TeaserPlayer } from '@/components/shared/TeaserPlayer';

/** À propos KEYNOTE : deux colonnes 40/60, titre à gauche, texte riche à droite. */
export function KeynoteAbout({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  return (
    <KeynoteSection id={SECTION_IDS.about} title={t('aboutTitle')}>
      <ScrollReveal>
        <div className="space-y-6">
          <div
            className="space-y-4 text-base leading-relaxed opacity-90 [&_a]:underline"
            // HTML restreint — re-sanitisé au rendu (défense en profondeur, audit §07)
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(l(config.content.description, locale)) }}
          />
          <TeaserPlayer url={config.content.teaser_video_url} />
        </div>
      </ScrollReveal>
    </KeynoteSection>
  );
}
