'use client';

import type { Partner } from '@/types/event-config';
import { ImageDropzone } from '../ImageDropzone';
import { ItemControls } from '../ItemControls';
import { AddButton } from '../AddButton';
import { FIELD, LBL } from '../fieldStyles';
import { newId, removeAt, renumber, replaceAt, swap } from '../listHelpers';
import { SaveButton } from './SaveButton';

export function PartnersTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: Partner[];
  onChange: (v: Partner[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = (next: Partner[]) => onChange(renumber(next));
  const patch = (i: number, p: Partial<Partner>) => set(replaceAt(value, i, { ...value[i], ...p }));
  const add = () =>
    set([...value, { id: newId('prt'), name: '', logo_url: '', url: null, sort_order: value.length }]);

  return (
    <div className="max-w-2xl space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun partenaire pour le moment.</p>
      )}

      {value.map((p, i) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Partenaire {i + 1}</span>
            <ItemControls
              isFirst={i === 0}
              isLast={i === value.length - 1}
              onUp={() => set(swap(value, i, i - 1))}
              onDown={() => set(swap(value, i, i + 1))}
              onDelete={() => set(removeAt(value, i))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <ImageDropzone aspect="aspect-[16/9]" value={p.logo_url} onChange={(u) => patch(i, { logo_url: u })} />
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={LBL}>Nom</label>
                <input className={FIELD} value={p.name} onChange={(e) => patch(i, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={LBL}>Lien (facultatif)</label>
                <input
                  className={FIELD}
                  value={p.url ?? ''}
                  onChange={(e) => patch(i, { url: e.target.value || null })}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <AddButton label="Ajouter un partenaire" onClick={add} />
      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
