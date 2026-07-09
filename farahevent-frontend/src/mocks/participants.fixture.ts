import type { ParticipantRow, ParticipantPaymentStatus } from '@/types/participant';

/**
 * Liste de participants fictive (déterministe) pour développer la vue admin
 * sans backend. ~48 lignes variées → filtres, tri et pagination significatifs.
 */

const FIRST = ['Awa', 'Yao', 'Fatou', 'Ibrahim', 'Mariam', 'Kwame', 'Aïcha', 'Moussa', 'Chantal', 'Kofi', 'Nadia', 'Sékou', 'Émilie', 'Adama', 'Léa', 'Jean'];
const LAST = ['Koné', 'Kouassi', 'Diallo', 'Traoré', 'Sow', 'Mensah', 'Bâ', 'Camara', 'Yao', 'Aidoo', 'Cissé', 'Touré', 'Bernard', 'Ouattara', 'Martin', 'Konaté'];
const COUNTRIES = ["Côte d'Ivoire", "Côte d'Ivoire", "Côte d'Ivoire", 'France', 'Sénégal', 'Mali', 'Burkina Faso', 'États-Unis', 'Canada', 'Ghana'];
const CITIES: Record<string, string> = {
  "Côte d'Ivoire": 'Abidjan',
  France: 'Paris',
  Sénégal: 'Dakar',
  Mali: 'Bamako',
  'Burkina Faso': 'Ouagadougou',
  'États-Unis': 'New York',
  Canada: 'Montréal',
  Ghana: 'Accra',
};

const FORMULAS: Array<{ name: string; channel: 'presentiel' | 'online'; amount: number }> = [
  { name: 'Standard', channel: 'presentiel', amount: 35000 },
  { name: 'VIP', channel: 'presentiel', amount: 150000 },
  { name: 'Online', channel: 'online', amount: 15000 },
];
const STATUSES: ParticipantPaymentStatus[] = ['paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'refunded'];

function build(): ParticipantRow[] {
  const rows: ParticipantRow[] = [];
  for (let i = 0; i < 48; i += 1) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7) % LAST.length];
    const country = COUNTRIES[(i * 3) % COUNTRIES.length];
    const formula = FORMULAS[i % FORMULAS.length];
    const status = STATUSES[(i * 5) % STATUSES.length];
    const payment_mode = i % 3 === 0 ? 'manual' : 'digital';
    const created = new Date(Date.now() - i * 14 * 3_600_000); // étalé sur ~28 j
    rows.push({
      id: `part_${String(i + 1).padStart(3, '0')}`,
      order_ref: `ORD-${90000 + i}`,
      first_name: first,
      last_name: last,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
      whatsapp: `+2250${(700000000 + i * 111111).toString().slice(0, 9)}`,
      country,
      city: CITIES[country] ?? null,
      formula: formula.name,
      channel: formula.channel,
      payment_mode,
      status,
      amount: formula.amount,
      currency: 'XOF',
      created_at: created.toISOString(),
      scanned: status === 'paid' && i % 4 === 0,
    });
  }
  return rows;
}

export const MOCK_PARTICIPANTS: ParticipantRow[] = build();
