'use client';

import type { EventOptions } from '@/types/event-config';
import { Switch } from '../Switch';
import { BilingualField } from '../BilingualField';
import { SaveButton } from './SaveButton';

type BoolOption = Exclude<keyof EventOptions, 'marquee_text'>;

const TOGGLES: Array<{ key: BoolOption; label: string; hint: string }> = [
  { key: 'show_tickets_counter', label: 'Compteur de billets', hint: 'Affiche les places restantes sur les formules.' },
  { key: 'show_countdown', label: 'Compte à rebours', hint: 'Bandeau décompte avant l\'événement.' },
  { key: 'show_speakers', label: 'Section intervenants', hint: 'Affiche la section speakers sur la vitrine.' },
  { key: 'show_live_qa', label: 'Q&A pendant le direct', hint: 'Questions du public sur la page live.' },
  { key: 'digital_enabled', label: 'Paiement digital', hint: 'Wave, Orange Money, MTN, carte bancaire.' },
  { key: 'manual_enabled', label: 'Paiement manuel', hint: 'Western Union, RIA, MoneyGram (envoi d\'un reçu).' },
  { key: 'chatbot_enabled', label: 'Chatbot d\'aide', hint: 'Widget FAQ en bas de la vitrine.' },
];

export function OptionsTab({
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  value: EventOptions;
  onChange: (v: EventOptions) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const marqueeOn = value.marquee_text !== null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card px-5 shadow-sm">
        {TOGGLES.map((t) => (
          <Switch
            key={t.key}
            label={t.label}
            hint={t.hint}
            checked={value[t.key]}
            onChange={(v) => onChange({ ...value, [t.key]: v })}
          />
        ))}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card px-5 shadow-sm">
          <Switch
            label="Bande défilante (marquee)"
            hint="Texte défilant du template Pulse."
            checked={marqueeOn}
            onChange={(v) =>
              onChange({ ...value, marquee_text: v ? (value.marquee_text ?? { fr: '', en: '' }) : null })
            }
          />
        </div>
        {marqueeOn && (
          <BilingualField
            label="Texte défilant"
            value={value.marquee_text ?? { fr: '', en: '' }}
            onChange={(v) => onChange({ ...value, marquee_text: v })}
          />
        )}
      </div>

      <SaveButton dirty={dirty} saving={saving} onClick={onSave} />
    </div>
  );
}
