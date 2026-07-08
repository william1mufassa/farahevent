import { create } from 'zustand';
import type { AdminNotification } from '@/types/admin-stats';

/**
 * Flux de notifications admin (CONCEPTION_FRONTEND.md §10.1) : seed initial
 * (fetch) + push temps réel (WS). Le compteur non-lus se dérive via sélecteur.
 */
interface NotificationsStore {
  items: AdminNotification[];
  setAll: (items: AdminNotification[]) => void;
  prepend: (n: AdminNotification) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

export const useNotifications = create<NotificationsStore>((set) => ({
  items: [],
  setAll: (items) => set({ items }),
  prepend: (n) =>
    set((s) => (s.items.some((i) => i.id === n.id) ? s : { items: [n, ...s.items] })),
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  markRead: (id) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
}));

export const selectUnreadCount = (s: NotificationsStore) =>
  s.items.reduce((n, i) => (i.read ? n : n + 1), 0);
