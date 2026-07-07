import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { KeynoteSection } from './KeynoteSection';

/** À propos KEYNOTE : deux colonnes 40/60, titre à gauche, texte riche à droite. */
export function KeynoteAbout({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  return (
    <KeynoteSection id={SECTION_IDS.about} title={t('aboutTitle')}>
      <ScrollReveal>
        <div
          className="space-y-4 text-base leading-relaxed opacity-90 [&_a]:underline"
          // HTML restreint, sanitisé côté backend (éditeur rich text admin)
          dangerouslySetInnerHTML={{ __html: l(config.content.description, locale) }}
        />
      </ScrollReveal>
    </KeynoteSection>
  );
}
