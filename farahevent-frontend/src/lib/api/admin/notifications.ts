import { adminApi } from '@/lib/admin-api';
import type { AdminNotification } from '@/types/admin-stats';
import { MOCK_ADMIN_NOTIFICATIONS } from '@/mocks/admin.fixture';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/** Notifications initiales (le WS pousse ensuite les nouvelles). */
export async function getAdminNotifications(): Promise<AdminNotification[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') return MOCK_ADMIN_NOTIFICATIONS;
  const res = await adminApi.get<AdminNotification[]>('/admin/notifications');
  return res.data;
}

/** URL du WS admin (http(s) → ws(s)), delta backend §13.5. null si base invalide. */
export function adminSocketUrl(): string | null {
  try {
    const u = new URL(API_URL);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = `${u.pathname.replace(/\/$/, '')}/ws/admin/notifications`;
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}
