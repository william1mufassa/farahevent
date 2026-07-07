export type EventMode = 'presentiel' | 'online' | 'hybrid';
export type EventTemplate = 'A' | 'B';
export type EventStatus = 'draft' | 'open' | 'live' | 'closed';
export type FormulaChannel = 'presentiel' | 'online' | 'both';

export interface FormulaPublic {
  id: string;
  name: string;
  description: string | null;
  advantages: string | null;
  price: number;
  currency: string;
  channel: FormulaChannel;
  available_quantity: number | null;
  is_sold_out: boolean;
  sort_order: number;
}

export interface PaymentConfigPublic {
  beneficiary_name: string | null;
  beneficiary_country: string | null;
  beneficiary_city: string | null;
  amount_fcfa: number | null;
  amount_eur: number | null;
  amount_usd: number | null;
  instructions_text: string | null;
  is_digital_enabled: boolean;
  is_manual_enabled: boolean;
}

export interface EventListItem {
  id: string;
  slug: string;
  name: string;
  mode: EventMode;
  template: EventTemplate;
  date: string;
  end_time: string | null;
  location: string | null;
  venue_city: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
}

export interface EventDetailPublic extends EventListItem {
  description: string | null;
  status: EventStatus;
  formulas: FormulaPublic[];
  payment_config: PaymentConfigPublic | null;
}
