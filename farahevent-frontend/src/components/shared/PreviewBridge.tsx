'use client';

import { useEffect } from 'react';

/**
 * Pont d'aperçu (CONCEPTION_FRONTEND.md §10.4). Monté uniquement en mode
 * `?preview=1` : applique en direct les couleurs postées par l'éditeur Design
 * (postMessage), sans sauvegarde. Le template, lui, passe par l'URL (reload).
 */
export function PreviewBridge() {
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; colors?: Record<string, string> };
      if (data?.type !== 'fe-preview' || !data.colors) return;
      const root = document.documentElement.style;
      const c = data.colors;
      if (c.primary) root.setProperty('--color-primary', c.primary);
      if (c.secondary) root.setProperty('--color-secondary', c.secondary);
      if (c.bg) root.setProperty('--color-bg', c.bg);
      if (c.text) root.setProperty('--color-text', c.text);
    };
    window.addEventListener('message', onMsg);
    // Prévient l'éditeur que le pont est prêt (re-post initial).
    window.parent?.postMessage({ type: 'fe-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return null;
}
