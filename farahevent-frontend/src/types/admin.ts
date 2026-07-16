export type AdminRole = 'super_admin' | 'manager' | 'agent' | 'comptable';

export interface AdminInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  two_factor_enabled: boolean;
}

export interface AdminOut {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  admin: AdminInfo;
}

export interface EventAdmin {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mode: string;
  status: string;
  template: string;
  date: string;
  end_time: string | null;
  location: string | null;
  venue_city: string | null;
  max_capacity: number | null;
  cover_image_url: string | null;
  is_featured: boolean;
  is_deleted: boolean;
  created_at: string;
  stream_key?: string | null;
  stream_hls_url?: string | null;
}

export interface FormulaAdmin {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  advantages: string | null;
  price: number;
  currency: string;
  channel: string;
  stock: number | null;
  sold_quantity: number;
  is_active: boolean;
  sort_order: number;
}

export interface ManualPaymentAdmin {
  id: string;
  order_id: string;
  operator: string;
  sender_name: string;
  sender_country: string;
  receipt_image_url: string;
  status: string;
  rejection_reason: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  order: { id: string; status: string; amount: number; currency: string };
  participant: {
    id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    whatsapp: string | null;
    country: string | null;
  };
  event: { id: string | null; name: string | null; slug: string | null };
  formula: { id: string | null; name: string | null; price: number | null };
}

export interface ScanResponse {
  valid: boolean;
  reason: string | null;
  ticket_id: string | null;
  participant_name: string | null;
  formula_name: string | null;
  event_name: string | null;
  scanned_at: string | null;
  first_scan_at: string | null;
  first_scan_by: string | null;
}

export interface PaymentConfigAdmin {
  event_id: string;
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
