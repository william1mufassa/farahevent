'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

import { getEventDraft, saveEventDraft } from '@/lib/api/admin/event-config';
import type { DraftSection, EventDraft } from '@/types/event-draft';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsShell, type TabDef } from '@/components/admin/event-config/TabsShell';
import { useUnsavedWarning } from '@/components/admin/event-config/useUnsavedWarning';
import { GeneralTab } from '@/components/admin/event-config/tabs/GeneralTab';
import { ContentTab } from '@/components/admin/event-config/tabs/ContentTab';
import { DesignTab } from '@/components/admin/event-config/tabs/DesignTab';
import { SpeakersTab } from '@/components/admin/event-config/tabs/SpeakersTab';
import { ProgrammeTab } from '@/components/admin/event-config/tabs/ProgrammeTab';
import { PartnersTab } from '@/components/admin/event-config/tabs/PartnersTab';
import { OptionsTab } from '@/components/admin/event-config/tabs/OptionsTab';
import { AutomationsTab } from '@/components/admin/event-config/tabs/AutomationsTab';
import { FormulasTab } from '@/components/admin/event-config/tabs/legacy/FormulasTab';
import { FaqsTab } from '@/components/admin/event-config/tabs/legacy/FaqsTab';
import { WhatsappGroupsTab } from '@/components/admin/event-config/tabs/legacy/WhatsappGroupsTab';
import { PaymentTab } from '@/components/admin/event-config/tabs/legacy/PaymentTab';

const CORE_SECTIONS: DraftSection[] = [
  'general',
  'content',
  'design',
  'speakers',
  'programme',
  'partners',
  'options',
  'automations',
];

export default function EventConfigPage() {
  const { id } = useParams<{ id: string }>();
  const [active, setActive] = useState('general');
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [baseline, setBaseline] = useState<EventDraft | null>(null);
  const [savingSection, setSavingSection] = useState<DraftSection | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'draft', id],
    queryFn: () => getEventDraft(id),
  });

  useEffect(() => {
    if (data && !draft) {
      setDraft(data);
      setBaseline(data);
    }
  }, [data, draft]);

  const isDirty = (s: DraftSection) =>
    !!draft && !!baseline && JSON.stringify(draft[s]) !== JSON.stringify(baseline[s]);
  const anyDirty = CORE_SECTIONS.some(isDirty);
  useUnsavedWarning(anyDirty);

  async function saveSection(section: DraftSection) {
    if (!draft) return;
    setSavingSection(section);
    try {
      await saveEventDraft(id, section, draft[section]);
      setBaseline((b) => (b ? { ...b, [section]: draft[section] } : b));
      toast.success('Modifications enregistrées.');
    } catch {
      toast.error("Échec de l'enregistrement.");
    } finally {
      setSavingSection(null);
    }
  }

  const tabs: TabDef[] = [
    { key: 'general', label: 'Général', dirty: isDirty('general') },
    { key: 'formules', label: 'Formules' },
    { key: 'contenu', label: 'Contenu', dirty: isDirty('content') },
    { key: 'speakers', label: 'Speakers', dirty: isDirty('speakers') },
    { key: 'programme', label: 'Programme', dirty: isDirty('programme') },
    { key: 'partenaires', label: 'Partenaires', dirty: isDirty('partners') },
    { key: 'chatbot', label: 'Chatbot' },
    { key: 'whatsapp', label: 'Groupes WhatsApp' },
    { key: 'design', label: 'Design', dirty: isDirty('design') },
    { key: 'paiement', label: 'Paiement' },
    { key: 'automations', label: 'Automations', dirty: isDirty('automations') },
    { key: 'options', label: 'Options', dirty: isDirty('options') },
  ];

  if (!draft) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/evenements"
          onClick={(e) => {
            if (anyDirty && !confirm('Quitter sans enregistrer les modifications ?')) {
              e.preventDefault();
            }
          }}
        >
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{draft.general.name.fr}</h1>
        <Badge variant="outline">{draft.general.status}</Badge>
      </div>

      <TabsShell tabs={tabs} active={active} onChange={setActive} />

      <div>
        {active === 'general' && (
          <GeneralTab
            value={draft.general}
            onChange={(v) => setDraft({ ...draft, general: v })}
            dirty={isDirty('general')}
            saving={savingSection === 'general'}
            onSave={() => saveSection('general')}
          />
        )}
        {active === 'contenu' && (
          <ContentTab
            value={draft.content}
            onChange={(v) => setDraft({ ...draft, content: v })}
            dirty={isDirty('content')}
            saving={savingSection === 'content'}
            onSave={() => saveSection('content')}
          />
        )}
        {active === 'design' && (
          <DesignTab
            slug={draft.general.slug}
            value={draft.design}
            onChange={(v) => setDraft({ ...draft, design: v })}
            dirty={isDirty('design')}
            saving={savingSection === 'design'}
            onSave={() => saveSection('design')}
          />
        )}

        {active === 'formules' && <FormulasTab eventId={id} />}
        {active === 'chatbot' && <FaqsTab eventId={id} />}
        {active === 'whatsapp' && <WhatsappGroupsTab eventId={id} />}
        {active === 'paiement' && <PaymentTab eventId={id} />}

        {active === 'speakers' && (
          <SpeakersTab
            value={draft.speakers}
            onChange={(v) => setDraft({ ...draft, speakers: v })}
            dirty={isDirty('speakers')}
            saving={savingSection === 'speakers'}
            onSave={() => saveSection('speakers')}
          />
        )}
        {active === 'programme' && (
          <ProgrammeTab
            value={draft.programme}
            speakers={draft.speakers}
            onChange={(v) => setDraft({ ...draft, programme: v })}
            dirty={isDirty('programme')}
            saving={savingSection === 'programme'}
            onSave={() => saveSection('programme')}
          />
        )}
        {active === 'partenaires' && (
          <PartnersTab
            value={draft.partners}
            onChange={(v) => setDraft({ ...draft, partners: v })}
            dirty={isDirty('partners')}
            saving={savingSection === 'partners'}
            onSave={() => saveSection('partners')}
          />
        )}
        {active === 'automations' && (
          <AutomationsTab
            value={draft.automations}
            onChange={(v) => setDraft({ ...draft, automations: v })}
            dirty={isDirty('automations')}
            saving={savingSection === 'automations'}
            onSave={() => saveSection('automations')}
          />
        )}
        {active === 'options' && (
          <OptionsTab
            value={draft.options}
            onChange={(v) => setDraft({ ...draft, options: v })}
            dirty={isDirty('options')}
            saving={savingSection === 'options'}
            onSave={() => saveSection('options')}
          />
        )}
      </div>
    </div>
  );
}
