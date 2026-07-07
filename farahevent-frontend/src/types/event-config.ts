/**
 * Contrat public complet consommé par la landing et les pages d'achat.
 * Source : GET /api/v1/events/{slug}/config (voir CONCEPTION_FRONTEND.md §5 et §13).
 *
 * Convention bilingue : chaque texte éditorial est un `Bilingual` ;
 * si `en` est null/vide, le frontend affiche `fr` (helper `l()` dans lib/localized.ts).
 */

export interface Bilingual {
  fr: string;
  en: string | null;
}

/** Valeurs de l'enum backend. A=KEYNOTE, B=SPOTLIGHT, C=DIRECTOR'S CUT, D=PULSE. */
export type TemplateKey = 'A' | 'B' | 'C' | 'D';

export type EventMode = 'presentiel' | 'online' | 'hybrid';
export type EventStatus = 'draft' | 'open' | 'live' | 'closed';
export type FormulaChannel = 'presentiel' | 'online' | 'both';

export interface EventInfo {
  id: string;
  slug: string;
  name: Bilingual;
  /** Date ISO (YYYY-MM-DD) */
  date: string;
  /** HH:mm */
  start_time: string;
  end_time: string | null;
  location: string | null;
  city: string | null;
  mode: EventMode;
  status: EventStatus;
  logo_url: string | null;
}

export interface EventColors {
  primary: string;
  secondary: string;
  /** Hex résolu, quel que soit bg_mode. */
  bg: string;
  bg_mode: 'light' | 'dark' | 'custom';
  /** null → auto-contraste calculé côté frontend (lib/contrast.ts). */
  text: string | null;
}

export interface EventDesign {
  template: TemplateKey;
  colors: EventColors;
}

export interface EventContent {
  hero_image_url: string;
  /** Autoplay muet desktop/tablette ; remplacée par hero_image_url sur mobile. */
  hero_video_url: string | null;
  /** Rich text — HTML restreint (p, strong, em, a, ul, ol, li). */
  description: Bilingual;
  /** Phrase d'accroche courte (template B pull-quote, etc.). null si non renseignée. */
  tagline: Bilingual | null;
  teaser_video_url: string | null;
  cta_presentiel: Bilingual;
  cta_online: Bilingual;
}

export interface FormulaConfig {
  id: string;
  name: Bilingual;
  description: Bilingual;
  advantages: Bilingual[];
  price: number;
  currency: 'XOF';
  channel: FormulaChannel;
  /** null si le compteur de billets est désactivé côté admin. */
  remaining: number | null;
  is_sold_out: boolean;
  /** Badge « Populaire » (mise en avant template B, disposition template D). */
  is_featured: boolean;
  sort_order: number;
}

export interface Speaker {
  id: string;
  name: string;
  title: Bilingual;
  bio: Bilingual;
  photo_url: string;
  sort_order: number;
}

export interface ProgrammeItem {
  id: string;
  /** HH:mm */
  start_time: string;
  end_time: string | null;
  title: Bilingual;
  description: Bilingual;
  speaker_ids: string[];
  sort_order: number;
}

export interface StatItem {
  value: number;
  /** Ex : « + » pour « 1 500+ ». */
  suffix: string | null;
  label: Bilingual;
}

export interface FaqItem {
  id: string;
  question: Bilingual;
  answer: Bilingual;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string;
  url: string | null;
  sort_order: number;
}

export interface EventOptions {
  show_tickets_counter: boolean;
  show_countdown: boolean;
  show_speakers: boolean;
  show_live_qa: boolean;
  digital_enabled: boolean;
  manual_enabled: boolean;
  chatbot_enabled: boolean;
  /** Bandes défilantes du template D. */
  marquee_text: Bilingual | null;
}

export interface SocialLink {
  kind: 'facebook' | 'instagram' | 'x' | 'linkedin' | 'youtube' | 'tiktok';
  url: string;
}

export interface FooterConfig {
  about: Bilingual;
  contact_email: string | null;
  contact_whatsapp: string | null;
  address: string | null;
  socials: SocialLink[];
}

export interface SupportConfig {
  /** Nom du service affiché dans le chatbot et les CTA support (configurable admin). */
  service_name: string;
  whatsapp_number: string;
}

/** Instructions de paiement manuel (WU / RIA / MoneyGram) — configurable admin. */
export interface PaymentManualConfig {
  beneficiary_name: string | null;
  beneficiary_country: string | null;
  beneficiary_city: string | null;
  /** Équivalents indicatifs en devises du tarif standard (informatif). */
  amount_eur: number | null;
  amount_usd: number | null;
  instructions: Bilingual | null;
}

export interface EventConfig {
  event: EventInfo;
  design: EventDesign;
  content: EventContent;
  formulas: FormulaConfig[];
  speakers: Speaker[];
  programme: ProgrammeItem[];
  stats: StatItem[];
  faqs: FaqItem[];
  partners: Partner[];
  options: EventOptions;
  /** null si le paiement manuel n'est pas configuré/activé. */
  payment_manual: PaymentManualConfig | null;
  footer: FooterConfig;
  support: SupportConfig;
  /** Badge « EN DIRECT » navbar. */
  is_live: boolean;
}

/** Fallbacks si l'API renvoie une couleur invalide (garde ThemeInjector). */
export const DEFAULT_COLORS: EventColors = {
  primary: '#E63946',
  secondary: '#457B9D',
  bg: '#FFFFFF',
  bg_mode: 'light',
  text: '#1D1D1D',
};
