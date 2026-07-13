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

/**
 * URL du WS admin avec ticket d'auth (http(s) → ws(s)), delta backend §13.5.
 *
 * Le JWT de session est en cookie httpOnly, non transmis au handshake WS
 * (connexion directe au backend, cross-origin). On échange donc d'abord un
 * ticket court-terme via le BFF authentifié, puis on le passe en query param.
 * Async et (ré)évaluée à chaque (re)connexion → ticket toujours frais.
 * Retourne null si le ticket est indisponible (session expirée, rôle non
 * autorisé, backend down) — useWebSocket retentera avec backoff.
 */
export async function adminSocketUrl(): Promise<string | null> {
  try {
    const { data } = await adminApi.get<{ ticket: string; expires_in: number }>(
      '/admin/ws-ticket',
    );
    if (!data?.ticket) return null;
    const u = new URL(API_URL);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = `${u.pathname.replace(/\/$/, '')}/ws/admin/notifications`;
    u.search = '';
    u.searchParams.set('ticket', data.ticket);
    return u.toString();
  } catch {
    return null;
  }
}
