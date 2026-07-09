'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Bilingual } from '@/types/event-config';
import { RichTextField } from './RichTextField';

type Variant = 'input' | 'textarea' | 'richtext';

/**
 * Champ bilingue FR/EN (CONCEPTION_FRONTEND.md §10.3) : sous-onglets par langue,
 * l'anglais vide hérite du français côté public (helper `l()`).
 */
export function BilingualField({
  label,
  value,
  onChange,
  variant = 'input',
  placeholder,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  variant?: Variant;
  placeholder?: string;
}) {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const current = lang === 'fr' ? value.fr : (value.en ?? '');
  const set = (text: string) =>
    onChange(lang === 'fr' ? { ...value, fr: text } : { ...value, en: text });
  const ph = lang === 'en' ? (placeholder ?? 'Laisser vide = hérite du FR') : placeholder;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex overflow-hidden rounded-md border border-border text-xs">
          {(['fr', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                'px-2 py-0.5 font-semibold uppercase transition-colors',
                lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {variant === 'richtext' ? (
        <RichTextField key={lang} value={current} onChange={set} />
      ) : variant === 'textarea' ? (
        <textarea
          value={current}
          onChange={(e) => set(e.target.value)}
          rows={3}
          placeholder={ph}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
        />
      ) : (
        <input
          value={current}
          onChange={(e) => set(e.target.value)}
          placeholder={ph}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
        />
      )}
    </div>
  );
}
