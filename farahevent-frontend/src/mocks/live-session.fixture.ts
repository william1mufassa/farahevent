import type { LiveSession } from '@/types/live';

/**
 * Fixture live pour développer sans backend (NEXT_PUBLIC_USE_MOCK=1).
 * Flux HLS de test public (Big Buck Bunny) → le player joue réellement.
 * `starts_at` est calculé quelques minutes dans le futur pour que l'aperçu
 * de l'état `waiting` affiche un vrai compte à rebours.
 */

const vtt = (text: string) => `data:text/vtt,${encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 00:00:30.000\n${text}\n`)}`;

export const MOCK_LIVE_SESSION: LiveSession = {
  state: 'playing',
  event: { name: 'Forum Horizons Tech 2026', slug: 'forum-horizons-2026' },
  stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  starts_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
  viewer: { name: 'Awa Traoré', email: 'awa.traore@example.com' },
  subtitles: [
    { lang: 'fr', label: 'Français', url: vtt('Diffusion en direct — Forum Horizons Tech 2026') },
    { lang: 'en', label: 'English', url: vtt('Live broadcast — Horizons Tech Forum 2026') },
  ],
  replay_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  viewer_count: 1287,
  support: { service_name: 'Service Billetterie', whatsapp_number: '+2250700000000' },
};
