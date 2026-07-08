import { adminApi } from '@/lib/admin-api';
import type { EventAdmin } from '@/types/admin';

export interface AdminEventLite {
  id: string;
  name: string;
  status: string;
}

/** Liste légère pour le sélecteur d'événement de la topbar. */
export async function getAdminEventsLite(): Promise<AdminEventLite[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return [
      { id: 'evt_mock_0001', name: 'Forum Horizons Tech 2026', status: 'live' },
      { id: 'evt_mock_0002', name: 'Gala des Startups 2026', status: 'open' },
    ];
  }
  const res = await adminApi.get<EventAdmin[]>('/admin/events/');
  return res.data.map((e) => ({ id: e.id, name: e.name, status: e.status }));
}
