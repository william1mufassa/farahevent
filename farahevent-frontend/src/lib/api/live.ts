import { api } from '@/lib/api';
import type { LiveSession } from '@/types/live';
import { MOCK_LIVE_SESSION } from '@/mocks/live-session.fixture';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Session live à partir du token JWT (query `?token=`). Appelé côté client
 * (React Query) car la donnée est volatile et pilotée ensuite par WS.
 * Une erreur (401/403/404…) est interprétée comme session invalide par l'écran.
 */
export async function getLiveSession(token: string): Promise<LiveSession> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return MOCK_LIVE_SESSION;
  }
  const res = await api.get<LiveSession>('/live/session', { params: { token } });
  return res.data;
}

/**
 * URL du WebSocket live, dérivée de l'API HTTP : http(s) → ws(s),
 * `{base}/ws/live/{token}` (delta backend §13.4). null si base invalide.
 */
export function liveSocketUrl(token: string): string | null {
  try {
    const u = new URL(API_URL);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = `${u.pathname.replace(/\/$/, '')}/ws/live/${encodeURIComponent(token)}`;
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}
