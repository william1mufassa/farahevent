'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BTN =
  'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30';

/** Contrôles de réordonnancement + suppression d'un élément de liste. */
export function ItemControls({
  onUp,
  onDown,
  onDelete,
  isFirst,
  isLast,
}: {
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={onUp} disabled={isFirst} className={BTN} aria-label="Monter">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDown} disabled={isLast} className={BTN} aria-label="Descendre">
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={cn(BTN, 'hover:text-destructive')}
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
