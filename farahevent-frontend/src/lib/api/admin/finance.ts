import { adminApi } from '@/lib/admin-api';
import type { FinanceData, FinanceSummary, Transaction } from '@/types/finance';
import { MOCK_TRANSACTIONS } from '@/mocks/finance.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

let store: Transaction[] | null = null;
const ensure = () => (store ??= MOCK_TRANSACTIONS.map((t) => ({ ...t })));

function summarize(txns: Transaction[]): FinanceSummary {
  let gross = 0;
  let refunded = 0;
  let pending = 0;
  for (const t of txns) {
    if (t.status === 'paid' || t.status === 'refunded') gross += t.amount;
    if (t.status === 'refunded') refunded += t.amount;
    if (t.status === 'pending') pending += t.amount;
  }
  return { gross, refunded, net: gross - refunded, pending, currency: 'XOF' };
}

export async function getFinance(): Promise<FinanceData> {
  if (IS_MOCK) {
    const transactions = ensure();
    return { summary: summarize(transactions), transactions };
  }
  return (await adminApi.get<FinanceData>('/admin/finance')).data;
}

export async function refundTransaction(id: string): Promise<void> {
  if (IS_MOCK) {
    const t = ensure().find((x) => x.id === id);
    if (t && t.status === 'paid') t.status = 'refunded';
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  await adminApi.post(`/admin/transactions/${id}/refund`);
}
