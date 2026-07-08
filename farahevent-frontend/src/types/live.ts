/**
 * Contrat de la page live (CONCEPTION_FRONTEND.md §9).
 * Source : GET /live/session?token= + WS /ws/live/{token} (delta backend §13.4).
 * Design neutre sombre — aucun template ni couleur d'événement.
 */

/** Machine à 5 états pilotée par le fetch initial puis le WebSocket. */
export type LiveSessionState = 'invalid' | 'waiting' | 'playing' | 'ejected' | 'ended';

export interface LiveSubtitleTrack {
  lang: 'fr' | 'en';
  label: string;
  /** Piste WebVTT. */
  url: string;
}

/** Identité du spectateur — affichée en filigrane anti-capture. */
export interface LiveViewer {
  name: string;
  email: string;
}

export interface LiveSession {
  state: LiveSessionState;
  event: {
    name: string;
    slug: string | null;
  };
  /** Manifeste HLS (.m3u8). null hors état `playing`. */
  stream_url: string | null;
  /** Début du direct (ISO) — countdown de l'état `waiting`. */
  starts_at: string | null;
  viewer: LiveViewer | null;
  subtitles: LiveSubtitleTrack[];
  /** URL du replay (état `ended`), si disponible. */
  replay_url: string | null;
  /** Compteur d'audience (null si masqué). */
  viewer_count: number | null;
  support: {
    service_name: string;
    whatsapp_number: string | null;
  };
}

/**
 * Messages serveur → client sur le WS live. Le backend pilote les transitions
 * d'état (waiting→playing→ended), le compteur d'audience et l'éjection
 * (session unique : ouverture sur un autre appareil).
 */
export type LiveServerMessage =
  | { type: 'state'; state: LiveSessionState; stream_url?: string | null; replay_url?: string | null }
  | { type: 'viewers'; count: number }
  | { type: 'ejected'; reason?: string | null };
