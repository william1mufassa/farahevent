'use client';

import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLiveSessionStore } from '@/stores/useLiveSession';

/**
 * Compteur d'audience — lit le store live (mis à jour par le WS).
 * Masqué si la donnée est absente (viewer_count null).
 */
export function ViewerCount() {
  const t = useTranslations('live');
  const count = useLiveSessionStore((s) => s.viewerCount);
  if (count === null) return null;

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Eye className="h-3.5 w-3.5" />
      {t('viewers', { count })}
    </div>
  );
}
