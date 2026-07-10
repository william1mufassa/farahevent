/** Vue Finances admin (CONCEPTION_FRONTEND.md §10.5) — construit mock-driven. */

export type TransactionStatus = 'paid' | 'refunded' | 'pending';

export interface Transaction {
  id: string;
  ref: string;
  participant: string;
  formula: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  payment_mode: 'digital' | 'manual';
  created_at: string;
}

export interface FinanceSummary {
  gross: number;
  refunded: number;
  net: number;
  pending: number;
  currency: string;
}

export interface FinanceData {
  summary: FinanceSummary;
  transactions: Transaction[];
}
