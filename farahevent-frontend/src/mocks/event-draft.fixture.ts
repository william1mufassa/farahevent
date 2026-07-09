import type { EventDraft } from '@/types/event-draft';
import { MOCK_EVENT_CONFIG } from './event-config.fixture';

/**
 * Brouillon de dev seedé depuis la config publique mock : l'éditeur admin
 * et la landing partagent ainsi les mêmes valeurs de départ.
 */
export const MOCK_EVENT_DRAFT: EventDraft = {
  id: MOCK_EVENT_CONFIG.event.id,
  general: {
    name: MOCK_EVENT_CONFIG.event.name,
    slug: MOCK_EVENT_CONFIG.event.slug,
    date: MOCK_EVENT_CONFIG.event.date,
    start_time: MOCK_EVENT_CONFIG.event.start_time,
    end_time: MOCK_EVENT_CONFIG.event.end_time,
    location: MOCK_EVENT_CONFIG.event.location,
    city: MOCK_EVENT_CONFIG.event.city,
    mode: MOCK_EVENT_CONFIG.event.mode,
    status: MOCK_EVENT_CONFIG.event.status,
    max_capacity: 1500,
  },
  content: {
    hero_image_url: MOCK_EVENT_CONFIG.content.hero_image_url,
    description: MOCK_EVENT_CONFIG.content.description,
    tagline: MOCK_EVENT_CONFIG.content.tagline ?? { fr: '', en: '' },
    cta_presentiel: MOCK_EVENT_CONFIG.content.cta_presentiel,
    cta_online: MOCK_EVENT_CONFIG.content.cta_online,
  },
  design: {
    template: MOCK_EVENT_CONFIG.design.template,
    colors: MOCK_EVENT_CONFIG.design.colors,
  },
};
