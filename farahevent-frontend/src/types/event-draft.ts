import type {
  Bilingual,
  EventColors,
  EventMode,
  EventStatus,
  TemplateKey,
} from '@/types/event-config';

/**
 * Brouillon éditable d'un événement (admin CMS, CONCEPTION_FRONTEND.md §10.3).
 * Représentation structurée des sections éditées par les onglets phares du
 * Lot 7 (Général, Contenu, Design). Chaque section a son PATCH isolé.
 */
export interface EventDraftGeneral {
  name: Bilingual;
  slug: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start_time: string;
  end_time: string | null;
  location: string | null;
  city: string | null;
  mode: EventMode;
  status: EventStatus;
  max_capacity: number | null;
}

export interface EventDraftContent {
  hero_image_url: string;
  /** Rich text HTML restreint (Tiptap). */
  description: Bilingual;
  tagline: Bilingual;
  cta_presentiel: Bilingual;
  cta_online: Bilingual;
}

export interface EventDraftDesign {
  template: TemplateKey;
  colors: EventColors;
}

export interface EventDraft {
  id: string;
  general: EventDraftGeneral;
  content: EventDraftContent;
  design: EventDraftDesign;
}

export type DraftSection = 'general' | 'content' | 'design';
