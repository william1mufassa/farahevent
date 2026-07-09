import type { ManualPaymentAdmin } from '@/types/admin';

/**
 * Paiements manuels fictifs pour la vue de validation admin (sans backend).
 * Reçus = images de test ; le manuel se valide/rejette en mémoire de session.
 */

interface Seed {
  first: string;
  last: string;
  country: string;
  operator: string;
  formula: string;
  price: number;
  status: 'pending' | 'validated' | 'rejected';
  reason?: string;
}

const SEEDS: Seed[] = [
  { first: 'Yao', last: 'Kouassi', country: 'France', operator: 'western_union', formula: 'Standard', price: 35000, status: 'pending' },
  { first: 'Mariam', last: 'Sow', country: 'Sénégal', operator: 'ria', formula: 'VIP', price: 150000, status: 'pending' },
  { first: 'Kwame', last: 'Mensah', country: 'Ghana', operator: 'moneygram', formula: 'Online', price: 15000, status: 'pending' },
  { first: 'Nadia', last: 'Cissé', country: 'Canada', operator: 'western_union', formula: 'Standard', price: 35000, status: 'pending' },
  { first: 'Adama', last: 'Traoré', country: 'Mali', operator: 'ria', formula: 'Standard', price: 35000, status: 'pending' },
  { first: 'Émilie', last: 'Bernard', country: 'France', operator: 'western_union', formula: 'VIP', price: 150000, status: 'validated' },
  { first: 'Sékou', last: 'Camara', country: 'Guinée', operator: 'moneygram', formula: 'Standard', price: 35000, status: 'validated' },
  { first: 'Jean', last: 'Martin', country: 'États-Unis', operator: 'ria', formula: 'Online', price: 15000, status: 'rejected', reason: 'Reçu illisible — merci de renvoyer une photo nette.' },
];

export const MOCK_MANUAL_PAYMENTS: ManualPaymentAdmin[] = SEEDS.map((s, i) => ({
  id: `mp_${String(i + 1).padStart(3, '0')}`,
  order_id: `ord_${9000 + i}`,
  operator: s.operator,
  sender_name: `${s.first} ${s.last}`,
  sender_country: s.country,
  receipt_image_url: `https://picsum.photos/seed/receipt${i}/600/800`,
  status: s.status,
  rejection_reason: s.reason ?? null,
  validated_by: s.status === 'validated' ? 'Awa Koné' : null,
  validated_at: s.status === 'validated' ? new Date(Date.now() - i * 3_600_000).toISOString() : null,
  created_at: new Date(Date.now() - i * 5_400_000).toISOString(),
  order: { id: `ord_${9000 + i}`, status: s.status === 'validated' ? 'MANUAL_VALIDATED' : 'MANUAL_PENDING', amount: s.price, currency: 'XOF' },
  participant: {
    id: `part_x${i}`,
    first_name: s.first,
    last_name: s.last,
    email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@example.com`,
    whatsapp: `+225070${(1000000 + i * 13579).toString().slice(0, 7)}`,
    country: s.country,
  },
  event: { id: 'evt_mock_0001', name: 'Forum Horizons Tech 2026', slug: 'forum-horizons-2026' },
  formula: { id: `form_${s.formula.toLowerCase()}`, name: s.formula, price: s.price },
}));
