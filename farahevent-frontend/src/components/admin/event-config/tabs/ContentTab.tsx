'use client';

import type { EventDraftContent } from '@/types/event-draft';
import { BilingualField } from '../BilingualField';
import { ImageDropzone } from '../ImageDropzone';
import { SaveButton } from './SaveButton';

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40';
const LBL = 'text-xs font-medium text-muted-foreground';

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
        <ImageDropzone value={value?.hero_image_url || ''} onChange={(u) => set('hero_image_url', u)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LBL}>{"Vidéo d'arrière-plan du Hero (URL MP4)"}</label>
          <input
            className={FIELD}
            type="url"
            value={value?.hero_video_url || ''}
            onChange={(e) => set('hero_video_url', e.target.value || null)}
            placeholder="https://example.com/hero.mp4"
          />
        </div>
        <div className="space-y-1.5">
          <label className={LBL}>{"Vidéo Teaser (URL MP4/YouTube/Vimeo)"}</label>
          <input
            className={FIELD}
            type="url"
            value={value?.teaser_video_url || ''}
            onChange={(e) => set('teaser_video_url', e.target.value || null)}
            placeholder="https://example.com/teaser.mp4"
          />
        </div>
      </div>

      <BilingualField
        label="Description"
        variant="richtext"
        value={value?.description || { fr: '', en: '' }}
        onChange={(v) => set('description', v)}
      />

      <BilingualField
        label="Accroche (tagline)"
        value={value?.tagline || { fr: '', en: '' }}
        onChange={(v) => set('tagline', v)}
        placeholder="Phrase courte d'accroche"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BilingualField
          label="Bouton présentiel"
          value={value?.cta_presentiel || { fr: '', en: '' }}
          onChange={(v) => set('cta_presentiel', v)}
        />
        <BilingualField
          label="Bouton en ligne"
          value={value?.cta_online || { fr: '', en: '' }}
          onChange={(v) => set('cta_online', v)}
        />
      </div>

      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
