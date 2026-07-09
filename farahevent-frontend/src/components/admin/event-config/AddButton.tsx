'use client';

import { Plus } from 'lucide-react';

/** Bouton « Ajouter un élément » d'une liste CRUD. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
