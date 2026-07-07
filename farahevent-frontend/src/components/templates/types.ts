import type { ComponentType } from 'react';
import type { Locale } from '@/lib/i18n/routing';
import type { EventConfig } from '@/types/event-config';

/**
 * Contrat commun des sections de template (CONCEPTION_FRONTEND.md §4.1).
 * Chaque template (A/B/C/D) implémente le même inventaire de sections avec
 * les mêmes props : la config décide QUOI afficher, le template décide COMMENT.
 * Les sections sont rendues par la composition de la landing ; elles ne
 * fetchent jamais elles-mêmes.
 */
export interface TemplateSectionProps {
  config: EventConfig;
  locale: Locale;
}

export type TemplateSectionComponent = ComponentType<TemplateSectionProps>;

export interface TemplateSections {
  Hero: TemplateSectionComponent;
  About: TemplateSectionComponent;
  /** Rendue seulement si options.show_speakers et speakers non vides. */
  Speakers: TemplateSectionComponent;
  Programme: TemplateSectionComponent;
  Formulas: TemplateSectionComponent;
  /** Rendue seulement si stats non vides. */
  Stats: TemplateSectionComponent;
  Faq: TemplateSectionComponent;
  Partners: TemplateSectionComponent;
}

/**
 * Ids d'ancres HTML, identiques quel que soit le template actif
 * (navbar et footer pointent dessus). Chaque section rend son propre
 * <section id=…> avec scroll-mt pour compenser la navbar fixe.
 */
export const SECTION_IDS = {
  about: 'apropos',
  speakers: 'speakers',
  programme: 'programme',
  pricing: 'tarifs',
  faq: 'faq',
  partners: 'partenaires',
} as const;
