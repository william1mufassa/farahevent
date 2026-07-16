/**
 * Contrat de la liste des participants admin (CONCEPTION_FRONTEND.md §10.5).
 * Une ligne = une commande payante d'un participant. Pas d'endpoint backend
 * pour l'instant (delta §13) → construit mock-driven.
 */

export type ParticipantPaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface ParticipantRow {
  id: string;
  order_ref: string;
  first_name: string;
  last_name: string;
  email: string;
  whatsapp: string;
  country: string;
  city: string | null;
  formula: string;
  channel: 'presentiel' | 'online';
  payment_mode: 'digital' | 'manual';
  status: ParticipantPaymentStatus;
  amount: number;
  currency: string;
  created_at: string;
  /** Entré sur site (billet scanné). */
  scanned: boolean;
  email_delivery_status: 'pending' | 'sent' | 'failed' | 'not_requested';
  whatsapp_delivery_status: 'pending' | 'sent' | 'failed' | 'not_requested';
}

export interface ParticipantsQuery {
  eventId?: string | null;
  search?: string;
  formula?: string;
  country?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface ParticipantsResult {
  rows: ParticipantRow[];
  total: number;
  /** Valeurs distinctes pour alimenter les filtres. */
  facets: { formulas: string[]; countries: string[] };
}
