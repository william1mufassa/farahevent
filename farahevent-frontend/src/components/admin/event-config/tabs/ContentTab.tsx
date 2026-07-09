'use client';

import type { EventDraftContent } from '@/types/event-draft';
import { BilingualField } from '../BilingualField';
import { ImageDropzone } from '../ImageDropzone';
import { SaveButton } from './SaveButton';

export function ContentTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: EventDraftContent;
  onChange: (v: EventDraftContent) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = <K extends keyof EventDraftContent>(k: K, v: EventDraftContent[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Image de couverture (hero)</label>
        <ImageDropzone value={value.hero_image_url} onChange={(u) => set('hero_image_url', u)} />
      </div>

      <BilingualField
        label="Description"
        variant="richtext"
        value={value.description}
        onChange={(v) => set('description', v)}
      />

      <BilingualField
        label="Accroche (tagline)"
        value={value.tagline}
        onChange={(v) => set('tagline', v)}
        placeholder="Phrase courte d'accroche"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BilingualField
          label="Bouton présentiel"
          value={value.cta_presentiel}
          onChange={(v) => set('cta_presentiel', v)}
        />
        <BilingualField
          label="Bouton en ligne"
          value={value.cta_online}
          onChange={(v) => set('cta_online', v)}
        />
      </div>

      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
