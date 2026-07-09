'use client';

import type { ProgrammeItem, Speaker } from '@/types/event-config';
import { cn } from '@/lib/utils';
import { BilingualField } from '../BilingualField';
import { ItemControls } from '../ItemControls';
import { AddButton } from '../AddButton';
import { FIELD, LBL } from '../fieldStyles';
import { newId, removeAt, renumber, replaceAt, swap } from '../listHelpers';
import { SaveButton } from './SaveButton';

export function ProgrammeTab({
  value,
  speakers,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: ProgrammeItem[];
  /** Liste des intervenants pour relier chaque session (lecture seule). */
  speakers: Speaker[];
  onChange: (v: ProgrammeItem[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = (next: ProgrammeItem[]) => onChange(renumber(next));
  const patch = (i: number, p: Partial<ProgrammeItem>) =>
    set(replaceAt(value, i, { ...value[i], ...p }));
  const add = () =>
    set([
      ...value,
      {
        id: newId('ses'),
        start_time: '09:00',
        end_time: null,
        title: { fr: '', en: '' },
        description: { fr: '', en: '' },
        speaker_ids: [],
        sort_order: value.length,
      },
    ]);

  const toggleSpeaker = (i: number, id: string) => {
    const ids = value[i].speaker_ids.includes(id)
      ? value[i].speaker_ids.filter((x) => x !== id)
      : [...value[i].speaker_ids, id];
    patch(i, { speaker_ids: ids });
  };

  return (
    <div className="max-w-2xl space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune session au programme.</p>
      )}

      {value.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Session {i + 1}</span>
            <ItemControls
              isFirst={i === 0}
              isLast={i === value.length - 1}
              onUp={() => set(swap(value, i, i - 1))}
              onDown={() => set(swap(value, i, i + 1))}
              onDelete={() => set(removeAt(value, i))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <div className="space-y-1">
              <label className={LBL}>Début</label>
              <input type="time" className={FIELD} value={s.start_time} onChange={(e) => patch(i, { start_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Fin</label>
              <input
                type="time"
                className={FIELD}
                value={s.end_time ?? ''}
                onChange={(e) => patch(i, { end_time: e.target.value || null })}
              />
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <BilingualField label="Titre" value={s.title} onChange={(v) => patch(i, { title: v })} />
            <BilingualField label="Description" variant="textarea" value={s.description} onChange={(v) => patch(i, { description: v })} />
          </div>

          {speakers.length > 0 && (
            <div className="mt-3">
              <p className={cn(LBL, 'mb-1.5')}>Intervenants</p>
              <div className="flex flex-wrap gap-1.5">
                {speakers.map((sp) => {
                  const on = s.speaker_ids.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => toggleSpeaker(i, sp.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                      )}
                    >
                      {sp.name || 'Sans nom'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <AddButton label="Ajouter une session" onClick={add} />
      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
