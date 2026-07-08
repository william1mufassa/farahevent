/**
 * Contrats du dashboard admin (CONCEPTION_FRONTEND.md §10.2).
 * Source : GET /admin/stats?event_id=&period= + WS /ws/admin/notifications
 * (delta backend §13.5–13.6). Construit mock-driven en attendant le backend.
 */

export type StatsPeriod = '7d' | '30d' | 'all';

export interface KpiSet {
  tickets_sold: number;
  scans: number;
  revenue: number;
  currency: string;
  /** null si aucun live en cours. */
  live_viewers: number | null;
  pending_manual: number;
}

export interface SalesByFormula {
  formula: string;
  count: number;
}

export interface SalesByCountry {
  country: string;
  count: number;
}

export interface RevenuePoint {
  /** Date ISO (YYYY-MM-DD). */
  date: string;
  revenue: number;
}

export type ActivityKind =
  | 'order_paid'
  | 'manual_pending'
  | 'manual_validated'
  | 'manual_rejected'
  | 'scan'
  | 'refund';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Libellé déjà formaté (FR). */
  label: string;
  amount: number | null;
  currency: string | null;
  at: string;
}

export interface DashboardStats {
  kpis: KpiSet;
  sales_by_formula: SalesByFormula[];
  sales_by_country: SalesByCountry[];
  revenue_series: RevenuePoint[];
  activity: ActivityItem[];
}

export type AdminNotificationKind = 'manual_pending' | 'order_paid' | 'scan_alert' | 'system';

export interface AdminNotification {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string | null;
  at: string;
  read: boolean;
  /** Déclenche un toast sonner à l'arrivée. */
  urgent: boolean;
  /** Lien cible du clic (ex. /admin/paiements). */
  href: string | null;
}

/** Message serveur → client sur le WS admin notifications. */
export type AdminWsMessage =
  | { type: 'notification'; notification: AdminNotification }
  | { type: 'viewers'; count: number };
