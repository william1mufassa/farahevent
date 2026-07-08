'use client';

import { Captions, CaptionsOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { LiveSubtitleTrack } from '@/types/live';

/**
 * Toggle des sous-titres (WebVTT). Cycle Off → FR → EN → Off.
 * Composant contrôlé : le player possède la <video> et applique les modes
 * de piste ; ce bouton ne fait qu'exprimer/cycler la sélection.
 */
export function SubtitlesToggle({
  tracks,
  active,
  onCycle,
}: {
  tracks: LiveSubtitleTrack[];
  /** Langue active, ou null si désactivé. */
  active: string | null;
  onCycle: () => void;
}) {
  const t = useTranslations('live');
  if (tracks.length === 0) return null;

  const label = active ? (tracks.find((tr) => tr.lang === active)?.label ?? 'CC') : t('ccOff');
  const Icon = active ? Captions : CaptionsOff;

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={t('ccToggle')}
      className={cn(
        'pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition',
        active ? 'bg-white/20 hover:bg-white/30' : 'bg-black/50 hover:bg-black/70',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
