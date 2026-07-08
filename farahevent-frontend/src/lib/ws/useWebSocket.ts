'use client';

import { useEffect, useRef, useState } from 'react';

export type WsStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

interface UseWebSocketOptions {
  /** Reçoit chaque message ; JSON parsé si possible, sinon string brute. */
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  /** Appelé sur une reconnexion réussie (pas à la 1ʳᵉ ouverture). */
  onReconnect?: () => void;
  /** Coupe la connexion si false (ex. mode mock). Défaut true. */
  enabled?: boolean;
  /** Délai de base du backoff, ms. Défaut 1000. */
  baseDelay?: number;
  /** Plafond du backoff, ms. Défaut 15000. */
  maxDelay?: number;
}

/**
 * WebSocket avec reconnexion automatique (backoff exponentiel + jitter).
 * SSR-safe (ne se connecte qu'au montage navigateur). Les callbacks sont lus
 * via ref : les changer ne recrée pas la connexion. Teardown strict.
 */
export function useWebSocket(url: string | null, options: UseWebSocketOptions = {}) {
  const { enabled = true, baseDelay = 1000, maxDelay = 15000 } = options;
  const [status, setStatus] = useState<WsStatus>('idle');

  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    if (!url || !enabled || typeof window === 'undefined') {
      setStatus('idle');
      return;
    }

    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    const scheduleReconnect = () => {
      if (closedByUs) return;
      setStatus('reconnecting');
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      // Jitter 50–100 % du délai : évite le troupeau de reconnexions synchrones.
      const wait = delay * (0.5 + Math.random() * 0.5);
      attempt += 1;
      reconnectTimer = setTimeout(connect, wait);
    };

    function connect() {
      if (closedByUs) return;
      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      try {
        ws = new WebSocket(url as string);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        const wasReconnect = attempt > 0;
        attempt = 0;
        setStatus('open');
        optsRef.current.onOpen?.();
        if (wasReconnect) optsRef.current.onReconnect?.();
      };

      ws.onmessage = (event) => {
        let data: unknown = event.data;
        try {
          data = JSON.parse(event.data as string);
        } catch {
          /* conserver la string brute */
        }
        optsRef.current.onMessage?.(data);
      };

      ws.onclose = () => {
        if (!closedByUs) scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose suit toujours une erreur → la reconnexion y est gérée.
        ws?.close();
      };
    }

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        ws.close();
      }
    };
  }, [url, enabled, baseDelay, maxDelay]);

  return { status };
}
