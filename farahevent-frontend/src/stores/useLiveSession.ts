import { create } from 'zustand';
import type { LiveSessionState } from '@/types/live';

/**
 * État runtime volatile de la session live (CONCEPTION_FRONTEND.md §3).
 * La session fetchée (stream, viewer, sous-titres) reste dans React Query ;
 * ce store ne porte que ce que le WS fait bouger : état, audience, éjection.
 * Découple les consommateurs (ViewerCount, LiveStates, Watermark) du WS.
 */
interface LiveSessionStore {
  state: LiveSessionState;
  viewerCount: number | null;
  ejectedReason: string | null;
  setState: (state: LiveSessionState) => void;
  setViewerCount: (viewerCount: number | null) => void;
  eject: (reason?: string | null) => void;
  /** Réinitialise depuis la session fetchée (au (re)chargement). */
  hydrate: (state: LiveSessionState, viewerCount: number | null) => void;
}

export const useLiveSessionStore = create<LiveSessionStore>((set) => ({
  state: 'waiting',
  viewerCount: null,
  ejectedReason: null,
  setState: (state) => set({ state }),
  setViewerCount: (viewerCount) => set({ viewerCount }),
  eject: (ejectedReason = null) => set({ state: 'ejected', ejectedReason }),
  hydrate: (state, viewerCount) => set({ state, viewerCount, ejectedReason: null }),
}));
