import type { AdminInfo, AdminRole } from '@/types/admin';
import type { AdminNotification, DashboardStats, RevenuePoint } from '@/types/admin-stats';

/**
 * Fixtures admin pour développer le dashboard sans backend
 * (NEXT_PUBLIC_USE_MOCK=1). Admin fictif paramétrable par rôle pour
 * prévisualiser les 4 vues (?role=agent|manager|comptable|super_admin).
 */

const ROLE_NAMES: Record<AdminRole, [string, string]> = {
  super_admin: ['Awa', 'Koné'],
  manager: ['Yao', 'Kouassi'],
  comptable: ['Fatou', 'Diallo'],
  agent: ['Ibrahim', 'Traoré'],
};

export function mockAdmin(role: AdminRole): AdminInfo {
  const [first_name, last_name] = ROLE_NAMES[role];
  return {
    id: `mock_${role}`,
    email: `${first_name.toLowerCase()}@farahevent.tech`,
    first_name,
    last_name,
    role,
    two_factor_enabled: role === 'super_admin',
  };
}

/** Série de revenus sur 30 jours (tendance croissante + bruit reproductible). */
function buildRevenueSeries(days: number): RevenuePoint[] {
  const out: RevenuePoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const base = 180_000 + (days - i) * 9000;
    const wobble = Math.round(Math.sin(i * 1.3) * 55_000);
    out.push({
      date: d.toISOString().slice(0, 10),
      revenue: Math.max(0, base + wobble),
    });
  }
  return out;
}

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  kpis: {
    tickets_sold: 1287,
    scans: 842,
    revenue: 48_650_000,
    currency: 'XOF',
    live_viewers: 2143,
    pending_manual: 7,
  },
  sales_by_formula: [
    { formula: 'Standard', count: 890 },
    { formula: 'VIP', count: 154 },
    { formula: 'Online', count: 243 },
  ],
  sales_by_country: [
    { country: "Côte d'Ivoire", count: 712 },
    { country: 'France', count: 218 },
    { country: 'Sénégal', count: 121 },
    { country: 'Mali', count: 89 },
    { country: 'États-Unis', count: 84 },
    { country: 'Autres', count: 63 },
  ],
  revenue_series: buildRevenueSeries(30),
  activity: [
    { id: 'a1', kind: 'order_paid', label: 'Awa Traoré — VIP', amount: 150_000, currency: 'XOF', at: minutesAgo(2) },
    { id: 'a2', kind: 'manual_pending', label: 'Yao Kouassi — Standard (Western Union)', amount: 35_000, currency: 'XOF', at: minutesAgo(9) },
    { id: 'a3', kind: 'scan', label: 'Entrée validée — badge #A1287', amount: null, currency: null, at: minutesAgo(14) },
    { id: 'a4', kind: 'order_paid', label: 'Fatou Diallo — Online', amount: 15_000, currency: 'XOF', at: minutesAgo(21) },
    { id: 'a5', kind: 'manual_validated', label: 'Ibrahim Bâ — Standard', amount: 35_000, currency: 'XOF', at: minutesAgo(33) },
    { id: 'a6', kind: 'scan', label: 'Entrée validée — badge #A1042', amount: null, currency: null, at: minutesAgo(41) },
    { id: 'a7', kind: 'refund', label: 'Remboursement — commande #ORD-90233', amount: 35_000, currency: 'XOF', at: minutesAgo(58) },
    { id: 'a8', kind: 'manual_rejected', label: 'Reçu illisible — commande #ORD-90210', amount: null, currency: null, at: minutesAgo(72) },
    { id: 'a9', kind: 'order_paid', label: 'Mariam Sow — Standard', amount: 35_000, currency: 'XOF', at: minutesAgo(88) },
    { id: 'a10', kind: 'scan', label: 'Entrée validée — badge #A0998', amount: null, currency: null, at: minutesAgo(103) },
  ],
};

export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  { id: 'n1', kind: 'manual_pending', title: 'Nouveau paiement manuel', body: 'Yao Kouassi — Standard (Western Union)', at: minutesAgo(9), read: false, urgent: true, href: '/admin/paiements' },
  { id: 'n2', kind: 'order_paid', title: 'Paiement confirmé', body: 'Awa Traoré — VIP · 150 000 FCFA', at: minutesAgo(2), read: false, urgent: false, href: null },
  { id: 'n3', kind: 'scan_alert', title: 'Billet déjà scanné', body: 'Badge #A1287 présenté deux fois', at: minutesAgo(14), read: false, urgent: true, href: '/admin/scan' },
  { id: 'n4', kind: 'system', title: 'Sauvegarde CMS publiée', body: 'Forum Horizons Tech 2026', at: minutesAgo(45), read: true, urgent: false, href: '/admin/evenements' },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}
