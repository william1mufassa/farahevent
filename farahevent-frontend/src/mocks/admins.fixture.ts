import type { AdminOut, AdminRole } from '@/types/admin';

/** Collaborateurs fictifs pour la vue Équipe sans backend. */
const SEED: Array<[string, string, string, AdminRole, boolean]> = [
  ['Awa', 'Koné', 'awa@farahevent.tech', 'super_admin', true],
  ['Yao', 'Kouassi', 'yao@farahevent.tech', 'manager', true],
  ['Fatou', 'Diallo', 'fatou@farahevent.tech', 'comptable', false],
  ['Ibrahim', 'Traoré', 'ibrahim@farahevent.tech', 'agent', false],
  ['Chantal', 'Bernard', 'chantal@farahevent.tech', 'manager', true],
  ['Moussa', 'Camara', 'moussa@farahevent.tech', 'agent', false],
];

export const MOCK_ADMINS: AdminOut[] = SEED.map(([first, last, email, role, twofa], i) => ({
  id: `adm_${String(i + 1).padStart(3, '0')}`,
  email,
  first_name: first,
  last_name: last,
  role,
  is_active: true,
  two_factor_enabled: twofa,
  last_login_at: new Date(Date.now() - i * 6 * 3_600_000).toISOString(),
  created_at: new Date(Date.now() - (i + 1) * 20 * 86_400_000).toISOString(),
}));
