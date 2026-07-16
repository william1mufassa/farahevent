import type {
  Bilingual,
  EventColors,
  EventMode,
  EventOptions,
  EventStatus,
  Partner,
  ProgrammeItem,
  Speaker,
  TemplateKey,
} from '@/types/event-config';

/**
 * Brouillon éditable d'un événement (admin CMS, CONCEPTION_FRONTEND.md §10.3).
 * Miroir structuré des sections éditables de la landing (contrat EventConfig) —
 * la « réconciliation » EventDraft ↔ EventConfig. Chaque section a son PATCH.
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
  hero_video_url: string | null;
  /** Rich text HTML restreint (Tiptap). */
  description: Bilingual;
  tagline: Bilingual;
  teaser_video_url: string | null;
  cta_presentiel: Bilingual;
  cta_online: Bilingual;
}

export interface EventDraftDesign {
  template: TemplateKey;
  colors: EventColors;
}

/** Déclencheur d'automation (J-7…J+7) — hors contrat public EventConfig. */
export interface AutomationRule {
  id: string;
  label: string;
  channel: 'email' | 'whatsapp' | 'both';
  /** Décalage en jours vs l'événement : négatif = avant, positif = après. */
  offset_days: number;
  enabled: boolean;
}

export interface EventDraft {
  id: string;
  general: EventDraftGeneral;
  content: EventDraftContent;
  design: EventDraftDesign;
  speakers: Speaker[];
  programme: ProgrammeItem[];
  partners: Partner[];
  options: EventOptions;
  automations: AutomationRule[];
}

export type DraftSection =
  | 'general'
  | 'content'
  | 'design'
  | 'speakers'
  | 'programme'
  | 'partners'
  | 'options'
  | 'automations';
