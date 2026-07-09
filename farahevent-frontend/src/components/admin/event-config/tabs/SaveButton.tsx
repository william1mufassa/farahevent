'use client';

import { Check, Loader2 } from 'lucide-react';

/** Bouton d'enregistrement d'un onglet (PATCH isolé, §10.3). */
export function SaveButton({
  dirty,
  saving,
  onClick,
}: {
  dirty: boolean;
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!dirty || saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {dirty && !saving && (
        <span className="text-xs font-medium text-amber-600">Modifications non enregistrées</span>
      )}
    </div>
  );
}
