import type { Transaction, TransactionStatus } from '@/types/finance';

/** Transactions fictives pour la vue Finances (sans backend). */
const NAMES = ['Awa Koné', 'Yao Kouassi', 'Fatou Diallo', 'Kwame Mensah', 'Mariam Sow', 'Ibrahim Bâ', 'Nadia Cissé', 'Adama Touré'];
const FORMULAS: Array<[string, number]> = [
  ['Standard', 35000],
  ['VIP', 150000],
  ['Online', 15000],
];
const STATUSES: TransactionStatus[] = ['paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'refunded', 'paid'];

export const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 24 }, (_, i) => {
  const [formula, amount] = FORMULAS[i % FORMULAS.length];
  return {
    id: `txn_${String(i + 1).padStart(3, '0')}`,
    ref: `ORD-${90000 + i}`,
    participant: NAMES[i % NAMES.length],
    formula,
    amount,
    currency: 'XOF',
    status: STATUSES[(i * 3) % STATUSES.length],
    payment_mode: i % 3 === 0 ? 'manual' : 'digital',
    created_at: new Date(Date.now() - i * 9 * 3_600_000).toISOString(),
  };
});
