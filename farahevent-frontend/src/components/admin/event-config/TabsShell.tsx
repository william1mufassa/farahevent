'use client';

import { cn } from '@/lib/utils';

export interface TabDef {
  key: string;
  label: string;
  /** Point orange si des modifications sont en attente. */
  dirty?: boolean;
}

/**
 * Barre d'onglets de la config événement (CONCEPTION_FRONTEND.md §10.3) :
 * défilable, point orange par onglet modifié.
 */
export function TabsShell({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.dirty && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                title="Modifications non enregistrées"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
