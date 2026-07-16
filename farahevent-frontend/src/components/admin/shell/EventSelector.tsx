'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown } from 'lucide-react';
import { getAdminEventsLite } from '@/lib/api/admin/events';
import { useAdminUi } from '@/stores/useAdminUi';

/**
 * Sélecteur d'événement (topbar) — filtre le dashboard. `null` = tous.
 * Persisté via useAdminUi. Select natif (convention du projet).
 */
export function EventSelector() {
  const selectedEventId = useAdminUi((s) => s.selectedEventId);
  const setSelectedEvent = useAdminUi((s) => s.setSelectedEvent);

  const { data: events } = useQuery({
    queryKey: ['admin', 'events-lite'],
    queryFn: getAdminEventsLite,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="relative">
      <select
        value={selectedEventId ?? ''}
        onChange={(e) => setSelectedEvent(e.target.value || null)}
        aria-label="Événement"
        className="h-9 w-40 appearance-none truncate rounded-xl border border-white/20 bg-white/60 pl-3 pr-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground outline-none transition-all duration-300 hover:bg-white/80 hover:text-foreground focus:ring-2 focus:ring-primary/20 dark:border-slate-800/40 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:ring-primary/20 sm:w-56"
      >
        <option value="">Tous les événements</option>
        {events?.map((e) => (
          <option key={e.id} value={e.id} className="text-foreground dark:bg-[#070b13]">
            {e.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
