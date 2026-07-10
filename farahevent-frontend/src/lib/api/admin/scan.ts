import { adminApi } from '@/lib/admin-api';
import type { ScanResponse } from '@/types/admin';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';
let counter = 0;

const NAMES = ['Awa Koné', 'Yao Kouassi', 'Fatou Diallo', 'Kwame Mensah', 'Mariam Sow'];
const FORMS = ['Standard', 'VIP'];

/**
 * Vérifie un billet (CONCEPTION_FRONTEND.md §10.5). Mock déterministe :
 * token contenant « bad »/« invalid » → refusé, 1 scan sur 4 → déjà scanné,
 * sinon accepté.
 */
export async function scanTicket(token: string): Promise<ScanResponse> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    const t = token.trim().toLowerCase();
    counter += 1;
    if (!t || t.includes('bad') || t.includes('invalid')) {
      return blank(false, 'invalid_token');
    }
    if (counter % 4 === 0) {
      return {
        ...blank(false, 'already_scanned'),
        ticket_id: `tkt_${counter}`,
        participant_name: 'Awa Koné',
        formula_name: 'VIP',
        event_name: 'Forum Horizons Tech 2026',
        first_scan_at: new Date(Date.now() - 3_600_000).toISOString(),
        first_scan_by: 'Ibrahim T.',
      };
    }
    return {
      valid: true,
      reason: null,
      ticket_id: `tkt_${counter}`,
      participant_name: NAMES[counter % NAMES.length],
      formula_name: FORMS[counter % FORMS.length],
      event_name: 'Forum Horizons Tech 2026',
      scanned_at: new Date().toISOString(),
      first_scan_at: null,
      first_scan_by: null,
    };
  }
  return (await adminApi.post<ScanResponse>('/tickets/scan', { qr_token: token })).data;
}

function blank(valid: boolean, reason: string): ScanResponse {
  return {
    valid,
    reason,
    ticket_id: null,
    participant_name: null,
    formula_name: null,
    event_name: null,
    scanned_at: null,
    first_scan_at: null,
    first_scan_by: null,
  };
}
