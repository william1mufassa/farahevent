'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutomationRule } from '@/types/event-draft';
import { AddButton } from '../AddButton';
import { FIELD, LBL } from '../fieldStyles';
import { newId, removeAt, replaceAt } from '../listHelpers';
import { SaveButton } from './SaveButton';

export function AutomationsTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: AutomationRule[];
  onChange: (v: AutomationRule[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const patch = (i: number, p: Partial<AutomationRule>) =>
    onChange(replaceAt(value, i, { ...value[i], ...p }));
  const add = () =>
    onChange([...value, { id: newId('auto'), label: '', channel: 'email', offset_days: 0, enabled: true }]);

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted-foreground">
        Rappels automatiques par email / WhatsApp autour de la date — décalage de J-7 à J+7.
      </p>

      {value.map((a, i) => (
        <div key={a.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="min-w-[150px] flex-1 space-y-1">
            <label className={LBL}>Libellé</label>
            <input className={FIELD} value={a.label} onChange={(e) => patch(i, { label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={LBL}>Canal</label>
            <select
              className={cn(FIELD, 'w-32')}
              value={a.channel}
              onChange={(e) => patch(i, { channel: e.target.value as AutomationRule['channel'] })}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="both">Les deux</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={LBL}>Jour (J±)</label>
            <input
              type="number"
              min={-7}
              max={7}
              className={cn(FIELD, 'w-20')}
              value={a.offset_days}
              onChange={(e) => patch(i, { offset_days: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <button
            type="button"
            onClick={() => patch(i, { enabled: !a.enabled })}
            className={cn(
              'h-9 rounded-full px-3 text-xs font-semibold transition-colors',
              a.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {a.enabled ? 'Actif' : 'Inactif'}
          </button>
          <button
            type="button"
            onClick={() => onChange(removeAt(value, i))}
            aria-label="Supprimer"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <AddButton label="Ajouter un déclencheur" onClick={add} />
      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
