'use client';

import { cn } from '@/lib/utils';
import type { TemplateKey } from '@/types/event-config';

const TEMPLATES: Array<{ key: TemplateKey; name: string; hint: string }> = [
  { key: 'A', name: 'Keynote', hint: 'Serif épuré, blanc cassé' },
  { key: 'B', name: 'Spotlight', hint: 'Cartes modernes, accent couleur' },
  { key: 'C', name: "Director's Cut", hint: 'Noir, photos plein cadre' },
  { key: 'D', name: 'Pulse', hint: 'Contraste fort, énergique' },
];

/** Sélecteur de template : 4 vignettes stylisées (CONCEPTION_FRONTEND.md §10.3). */
export function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateKey;
  onChange: (t: TemplateKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TEMPLATES.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'rounded-xl border-2 p-3 text-left transition',
              active
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40',
            )}
          >
            <div className="mb-2 flex h-16 flex-col justify-between rounded-md bg-muted p-1.5">
              <div className="h-1.5 w-8 rounded-full bg-foreground/30" />
              <div className="space-y-0.5">
                <div className="h-1 w-full rounded-full bg-foreground/15" />
                <div className="h-1 w-2/3 rounded-full bg-foreground/15" />
              </div>
            </div>
            <p className="text-sm font-semibold">
              {t.key} · {t.name}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
