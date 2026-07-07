export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'MANUAL_PENDING'
  | 'MANUAL_VALIDATED'
  | 'REJECTED'
  | 'REFUNDED';

export type PaymentMode = 'digital' | 'manual';
export type TicketDeliveryPref = 'email' | 'whatsapp' | 'both';

export interface ParticipantInput {
  first_name: string;
  last_name: string;
  email: string;
  whatsapp: string;
  country: string;
  city?: string | null;
  ticket_delivery_pref: TicketDeliveryPref;
}

export interface OrderCreateRequest {
  event_id: string;
  formula_id: string;
  participant: ParticipantInput;
  payment_mode: PaymentMode;
  payment_method_label?: string | null;
  /** Vérification Turnstile — ignoré par le backend tant que non implémenté (delta §13). */
  turnstile_token?: string | null;
}

export interface OrderCreateResponse {
  order_id: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  payment_mode: PaymentMode;
  checkout_url: string | null;
  manual_upload_hint: string | null;
}

export interface OrderPublicStatus {
  id: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  payment_mode: PaymentMode | null;
  payment_method_label: string | null;
  event: { id: string | null; name: string | null; slug: string | null; date: string | null };
  formula: {
    id: string | null;
    name: string | null;
    /** Optionnel — exposé par le backend plus tard (delta §13). */
    channel?: 'presentiel' | 'online' | 'both' | null;
  };
  manual_payment_status: string | null;
  created_at: string;
  /** Aperçu du QR (présentiel, une fois payé) — optionnel, delta §13. */
  qr_image_url?: string | null;
}
