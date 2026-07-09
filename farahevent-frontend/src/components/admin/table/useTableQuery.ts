'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Lecture/écriture des filtres de tableau dans l'URL (CONCEPTION_FRONTEND.md
 * §10.5) : ?search=&formula=&country=&status=&page=&sort=&dir= — filtres
 * partageables et compatibles bouton retour.
 */
export function useTableQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const get = useCallback((key: string) => sp.get(key) ?? '', [sp]);

  const setParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, sp],
  );

  return { get, setParams };
}
