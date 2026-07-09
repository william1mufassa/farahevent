import { adminApi } from '@/lib/admin-api';
import type { ManualPaymentAdmin } from '@/types/admin';
import { MOCK_MANUAL_PAYMENTS } from '@/mocks/manual-payments.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

// Copie de session mutée par valider/rejeter (persiste entre navigations).
let store: ManualPaymentAdmin[] | null = null;
const ensure = () => (store ??= MOCK_MANUAL_PAYMENTS.map((p) => ({ ...p })));

export async function getManualPayments(status: string): Promise<ManualPaymentAdmin[]> {
  if (IS_MOCK) {
    const all = ensure();
    return status ? all.filter((p) => p.status === status) : all;
  }
  const params = status ? `?status=${status}` : '';
  return (await adminApi.get<ManualPaymentAdmin[]>(`/admin/manual-payments/${params}`)).data;
}

export async function validateManualPayment(id: string): Promise<{ tickets_generated: number }> {
  if (IS_MOCK) {
    const p = ensure().find((x) => x.id === id);
    if (p) {
      p.status = 'validated';
      p.validated_at = new Date().toISOString();
      p.validated_by = 'Awa Koné';
      p.order.status = 'MANUAL_VALIDATED';
    }
    await new Promise((r) => setTimeout(r, 300));
    return { tickets_generated: 1 };
  }
  return (await adminApi.post<{ tickets_generated: number }>(`/admin/manual-payments/${id}/validate`)).data;
}

export async function rejectManualPayment(id: string, reason: string): Promise<void> {
  if (IS_MOCK) {
    const p = ensure().find((x) => x.id === id);
    if (p) {
      p.status = 'rejected';
      p.rejection_reason = reason;
    }
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  await adminApi.post(`/admin/manual-payments/${id}/reject`, { reason });
}
