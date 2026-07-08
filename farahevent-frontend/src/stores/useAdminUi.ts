import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminTheme = 'light' | 'dark';

/**
 * État UI du dashboard admin (CONCEPTION_FRONTEND.md §3), persisté en
 * localStorage : sidebar repliée, thème clair/sombre, événement sélectionné
 * (le sélecteur de la topbar filtre le dashboard).
 */
interface AdminUiStore {
  sidebarCollapsed: boolean;
  theme: AdminTheme;
  selectedEventId: string | null;
  toggleSidebar: () => void;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  setSelectedEvent: (id: string | null) => void;
}

export const useAdminUi = create<AdminUiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      selectedEventId: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setSelectedEvent: (selectedEventId) => set({ selectedEventId }),
    }),
    { name: 'fe-admin-ui' },
  ),
);
