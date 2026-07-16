import { adminApi } from '@/lib/admin-api';
import type { EventAdmin } from '@/types/admin';

export interface AdminEventLite {
  id: string;
  name: string;
  status: string;
}

// Store en mémoire pour préserver les modifications d'événements mockés pendant la session de dév.
let mockEvents: EventAdmin[] = [
  {
    id: 'evt_mock_0001',
    slug: 'forum-horizons-tech-2026',
    name: 'Forum Horizons Tech 2026',
    description: 'Le forum annuel sur les nouvelles technologies.',
    mode: 'hybrid',
    status: 'live',
    template: 'A',
    date: '2026-07-20T09:00:00Z',
    end_time: '2026-07-20T18:00:00Z',
    location: 'Palais des Congrès, Abidjan',
    venue_city: 'Abidjan',
    max_capacity: 1500,
    cover_image_url: null,
    is_featured: true,
    is_deleted: false,
    created_at: '2026-07-05T12:00:00Z',
    stream_key: 'stream_mock_key_abc123',
    stream_hls_url: 'https://stream.farahevent.tech/live/stream_mock_key_abc123.m3u8',
  },
  {
    id: 'evt_mock_0002',
    slug: 'gala-des-startups-2026',
    name: 'Gala des Startups 2026',
    description: 'La soirée prestigieuse célébrant l’innovation.',
    mode: 'online',
    status: 'open',
    template: 'B',
    date: '2026-08-15T19:00:00Z',
    end_time: '2026-08-15T23:30:00Z',
    location: 'En ligne',
    venue_city: null,
    max_capacity: 3000,
    cover_image_url: null,
    is_featured: false,
    is_deleted: false,
    created_at: '2026-07-10T14:30:00Z',
    stream_key: null,
    stream_hls_url: null,
  }
];

/** Liste légère pour le sélecteur d'événement de la topbar. */
export async function getAdminEventsLite(): Promise<AdminEventLite[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return mockEvents.map((e) => ({ id: e.id, name: e.name, status: e.status }));
  }
  const res = await adminApi.get<EventAdmin[]>(('/admin/events/'));
  return res.data.map((e) => ({ id: e.id, name: e.name, status: e.status }));
}

/** Récupération complète d'un événement. */
export async function getAdminEvent(id: string): Promise<EventAdmin> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    // Si l'id ressemble à un vrai UUID mais qu'on est en mock, on renvoie le premier pour éviter le crash.
    const ev = mockEvents.find((e) => e.id === id) || mockEvents[0];
    return { ...ev, id }; // préserve l'id demandé
  }
  const res = await adminApi.get<EventAdmin>(`/admin/events/${id}`);
  return res.data;
}

/** Mise à jour du statut (transition draft -> open -> live -> closed). */
export async function updateEventStatus(id: string, status: string): Promise<EventAdmin> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    const idx = mockEvents.findIndex((e) => e.id === id);
    if (idx !== -1) {
      mockEvents[idx] = { ...mockEvents[idx], status };
      return { ...mockEvents[idx] };
    }
    // Fallback si l'ID n'a pas été trouvé (ex: vrai UUID en mode mock)
    mockEvents[0] = { ...mockEvents[0], status };
    return { ...mockEvents[0] };
  }
  const res = await adminApi.patch<EventAdmin>(`/admin/events/${id}/status`, { status });
  return res.data;
}

/** Mise à jour des paramètres de streaming (stream_key + stream_hls_url). */
export async function updateEventStream(
  id: string,
  streamKey: string,
  streamHlsUrl: string,
): Promise<EventAdmin> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    const idx = mockEvents.findIndex((e) => e.id === id);
    if (idx !== -1) {
      mockEvents[idx] = { ...mockEvents[idx], stream_key: streamKey, stream_hls_url: streamHlsUrl };
      return { ...mockEvents[idx] };
    }
    mockEvents[0] = { ...mockEvents[0], stream_key: streamKey, stream_hls_url: streamHlsUrl };
    return { ...mockEvents[0] };
  }
  const res = await adminApi.patch<EventAdmin>(`/admin/events/${id}`, {
    stream_key: streamKey,
    stream_hls_url: streamHlsUrl,
  });
  return res.data;
}
