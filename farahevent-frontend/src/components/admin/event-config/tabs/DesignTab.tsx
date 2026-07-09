'use client';

import type { EventDraftDesign } from '@/types/event-draft';
import type { TemplateKey } from '@/types/event-config';
import { TemplatePicker } from '../TemplatePicker';
import { ColorField } from '../ColorField';
import { DesignPreview } from '../DesignPreview';
import { SaveButton } from './SaveButton';

export function DesignTab({
  slug,
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  slug: string;
  value: EventDraftDesign;
  onChange: (v: EventDraftDesign) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const setColor = (k: 'primary' | 'secondary' | 'bg' | 'text', v: string | null) =>
    onChange({ ...value, colors: { ...value.colors, [k]: v } });
  const autoText = value.colors.text === null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Template</label>
          <TemplatePicker
            value={value.template}
            onChange={(t: TemplateKey) => onChange({ ...value, template: t })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Couleurs</label>
          <div className="flex flex-wrap gap-4">
            <ColorField label="Primaire" value={value.colors.primary} onChange={(v) => setColor('primary', v)} />
            <ColorField label="Secondaire" value={value.colors.secondary} onChange={(v) => setColor('secondary', v)} />
            <ColorField label="Fond" value={value.colors.bg} onChange={(v) => setColor('bg', v)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={autoText}
              onChange={(e) => setColor('text', e.target.checked ? null : '#1d1d1d')}
            />
            Couleur de texte automatique (contraste WCAG)
          </label>
          {!autoText && (
            <ColorField label="Texte" value={value.colors.text ?? '#1d1d1d'} onChange={(v) => setColor('text', v)} />
          )}
        </div>

        <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <DesignPreview slug={slug} design={value} />
      </div>
    </div>
  );
}
