import { adminApi } from '@/lib/admin-api';
import type { DraftSection, EventDraft } from '@/types/event-draft';
import { MOCK_EVENT_DRAFT } from '@/mocks/event-draft.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

// Brouillon mock en mémoire de session (persiste entre onglets, pas au reload).
let mockDraft: EventDraft | null = null;
function ensureMockDraft(): EventDraft {
  if (!mockDraft) mockDraft = structuredClone(MOCK_EVENT_DRAFT);
  return mockDraft;
}

/**
 * Brouillon structuré d'un événement pour les onglets Général/Contenu/Design
 * (delta backend §13.7). Mock : seed depuis la config publique.
 */
export async function getEventDraft(id: string): Promise<EventDraft> {
  if (IS_MOCK) return structuredClone({ ...ensureMockDraft(), id });
  const res = await adminApi.get<EventDraft>(`/admin/events/${id}/draft`);
  return res.data;
}

/**
 * Sauvegarde d'une section (PATCH isolé par onglet). La revalidation ISR de la
 * landing est déclenchée par le backend après sauvegarde (§6.3), pas ici.
 */
export async function saveEventDraft<S extends DraftSection>(
  id: string,
  section: S,
  data: EventDraft[S],
): Promise<void> {
  if (IS_MOCK) {
    const draft = ensureMockDraft();
    mockDraft = { ...draft, [section]: structuredClone(data) };
    await new Promise((r) => setTimeout(r, 300)); // latence simulée
    return;
  }
  await adminApi.patch(`/admin/events/${id}/${section}`, data);
}
