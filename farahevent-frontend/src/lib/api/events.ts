import type { EventConfig } from '@/types/event-config';
import { MOCK_EVENT_CONFIG } from '@/mocks/event-config.fixture';

/**
 * Fetchers serveur (RSC) pour la config publique d'un événement.
 * ISR 60 s + tag `event:{slug}` invalidé à la demande par le backend
 * via POST /api/revalidate après chaque sauvegarde CMS.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function eventTag(slug: string): string {
  return `event:${slug}`;
}

export async function getEventConfig(slug: string): Promise<EventConfig | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    // N'importe quel slug sert la fixture : pratique pour développer les templates.
    return { ...MOCK_EVENT_CONFIG, event: { ...MOCK_EVENT_CONFIG.event, slug } };
  }

  const res = await fetch(`${API_URL}/events/${encodeURIComponent(slug)}/config`, {
    next: { revalidate: 60, tags: [eventTag(slug)] },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`getEventConfig(${slug}) — HTTP ${res.status}`);
  }
  return (await res.json()) as EventConfig;
}
