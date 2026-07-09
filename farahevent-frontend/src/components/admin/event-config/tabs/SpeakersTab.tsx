'use client';

import type { Speaker } from '@/types/event-config';
import { BilingualField } from '../BilingualField';
import { ImageDropzone } from '../ImageDropzone';
import { ItemControls } from '../ItemControls';
import { AddButton } from '../AddButton';
import { FIELD, LBL } from '../fieldStyles';
import { newId, removeAt, renumber, replaceAt, swap } from '../listHelpers';
import { SaveButton } from './SaveButton';

export function SpeakersTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: Speaker[];
  onChange: (v: Speaker[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = (next: Speaker[]) => onChange(renumber(next));
  const patch = (i: number, p: Partial<Speaker>) => set(replaceAt(value, i, { ...value[i], ...p }));
  const add = () =>
    set([
      ...value,
      { id: newId('spk'), name: '', title: { fr: '', en: '' }, bio: { fr: '', en: '' }, photo_url: '', sort_order: value.length },
    ]);

  return (
    <div className="max-w-2xl space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun intervenant pour le moment.</p>
      )}

      {value.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Intervenant {i + 1}</span>
            <ItemControls
              isFirst={i === 0}
              isLast={i === value.length - 1}
              onUp={() => set(swap(value, i, i - 1))}
              onDown={() => set(swap(value, i, i + 1))}
              onDelete={() => set(removeAt(value, i))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
            <ImageDropzone aspect="aspect-[3/4]" value={s.photo_url} onChange={(u) => patch(i, { photo_url: u })} />
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={LBL}>Nom</label>
                <input className={FIELD} value={s.name} onChange={(e) => patch(i, { name: e.target.value })} />
              </div>
              <BilingualField label="Fonction" value={s.title} onChange={(v) => patch(i, { title: v })} />
            </div>
          </div>
          <div className="mt-3">
            <BilingualField label="Bio" variant="richtext" value={s.bio} onChange={(v) => patch(i, { bio: v })} />
          </div>
        </div>
      ))}

      <AddButton label="Ajouter un intervenant" onClick={add} />
      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
