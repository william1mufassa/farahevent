'use client';

import type { EventDraftGeneral } from '@/types/event-draft';
import type { EventMode, EventStatus } from '@/types/event-config';
import { BilingualField } from '../BilingualField';
import { SaveButton } from './SaveButton';

const MODES: Array<{ v: EventMode; l: string }> = [
  { v: 'presentiel', l: 'Présentiel' },
  { v: 'online', l: 'En ligne' },
  { v: 'hybrid', l: 'Hybride' },
];
const STATUSES: Array<{ v: EventStatus; l: string }> = [
  { v: 'draft', l: 'Brouillon' },
  { v: 'open', l: 'Ouvert' },
  { v: 'live', l: 'En direct' },
  { v: 'closed', l: 'Fermé' },
];

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40';
const LBL = 'text-xs font-medium text-muted-foreground';

export function GeneralTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: EventDraftGeneral;
  onChange: (v: EventDraftGeneral) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = <K extends keyof EventDraftGeneral>(k: K, v: EventDraftGeneral[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="max-w-2xl space-y-5">
      <BilingualField label="Nom de l'événement" value={value?.name || { fr: '', en: '' }} onChange={(v) => set('name', v)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LBL}>Slug</label>
          <input
            className={FIELD}
            value={value.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          />
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>Statut</label>
          <select className={FIELD} value={value.status} onChange={(e) => set('status', e.target.value as EventStatus)}>
            {STATUSES.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className={LBL}>Date</label>
          <input type="date" className={FIELD} value={value.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>Début</label>
          <input type="time" className={FIELD} value={value.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>Fin</label>
          <input
            type="time"
            className={FIELD}
            value={value.end_time ?? ''}
            onChange={(e) => set('end_time', e.target.value || null)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LBL}>Lieu</label>
          <input className={FIELD} value={value.location ?? ''} onChange={(e) => set('location', e.target.value || null)} />
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>Ville</label>
          <input className={FIELD} value={value.city ?? ''} onChange={(e) => set('city', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LBL}>Mode</label>
          <select className={FIELD} value={value.mode} onChange={(e) => set('mode', e.target.value as EventMode)}>
            {MODES.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>Capacité max</label>
          <input
            type="number"
            className={FIELD}
            value={value.max_capacity ?? ''}
            onChange={(e) => set('max_capacity', e.target.value ? parseInt(e.target.value, 10) : null)}
          />
        </div>
      </div>

      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
