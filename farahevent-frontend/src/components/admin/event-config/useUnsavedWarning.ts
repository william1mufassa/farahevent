'use client';

import { useEffect } from 'react';

/**
 * Avertit avant fermeture/rechargement de la page si des modifications sont
 * en attente (CONCEPTION_FRONTEND.md §10.3, UnsavedGuard). La navigation
 * interne (lien Retour) est gardée séparément par une confirmation.
 */
export function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
