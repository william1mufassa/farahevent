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
  speakers: MOCK_EVENT_CONFIG.speakers,
  programme: MOCK_EVENT_CONFIG.programme,
  partners: MOCK_EVENT_CONFIG.partners,
  options: MOCK_EVENT_CONFIG.options,
  automations: [
    { id: 'auto_1', label: 'Rappel J-7', channel: 'email', offset_days: -7, enabled: true },
    { id: 'auto_2', label: 'Rappel J-1', channel: 'both', offset_days: -1, enabled: true },
    { id: 'auto_3', label: 'Lien du direct J-0', channel: 'whatsapp', offset_days: 0, enabled: true },
    { id: 'auto_4', label: 'Remerciement + replay J+1', channel: 'email', offset_days: 1, enabled: false },
  ],
};
