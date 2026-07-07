'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X, HelpCircle, Send } from 'lucide-react';

import { api } from '@/lib/api';

export interface ChatbotFaq {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  eventSlug: string;
  /** Numéro WhatsApp du support (EventConfig.support). */
  whatsappNumber?: string | null;
  /** Nom du service affiché sur le bouton support (configurable admin). */
  supportName?: string;
  /** FAQs déjà localisées (EventConfig) — si fournies, aucun fetch. */
  faqs?: ChatbotFaq[];
}

/**
 * Widget chatbot public (CDC §3.2) : FAQ cliquables + recherche, escalade
 * WhatsApp avec message pré-rempli. La saisie libre LLM et la vérification
 * de statut de commande arrivent avec le backend dédié (Lot ultérieur).
 */
export function ChatbotWidget({ eventSlug, whatsappNumber, supportName, faqs: providedFaqs }: Props) {
  const t = useTranslations('chatbot');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: fetchedFaqs } = useQuery({
    queryKey: ['public', 'faqs', eventSlug],
    queryFn: async () => (await api.get<ChatbotFaq[]>(`/events/${eventSlug}/faqs`)).data,
    enabled: open && !providedFaqs,
  });

  const faqs = providedFaqs ?? fetchedFaqs;

  const filtered =
    search.trim().length === 0
      ? faqs
      : faqs?.filter((f) =>
          `${f.question} ${f.answer}`.toLowerCase().includes(search.toLowerCase()),
        );

  const supportNumber = whatsappNumber ?? '2250000000000';
  const waLink = `https://wa.me/${supportNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    t('waPrefill', { event: eventSlug }),
  )}`;
  const serviceLabel = supportName ?? t('defaultService');

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform hover:scale-105"
          aria-label={t('open')}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b bg-[var(--color-primary)] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">{t('title')}</p>
                <p className="text-xs opacity-80">{serviceLabel}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/10"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b p-3">
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!faqs ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : filtered?.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noResults')}</p>
            ) : (
              <div className="space-y-2">
                {filtered?.map((f) => <FaqItem key={f.id} faq={f} />)}
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" /> {t('supportCta', { service: serviceLabel })}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function FaqItem({ faq }: { faq: ChatbotFaq }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        <span>{faq.question}</span>
        <span className="text-xs text-muted-foreground">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="whitespace-pre-line border-t bg-muted/20 p-3 text-sm text-muted-foreground">
          {faq.answer}
        </div>
      )}
    </div>
  );
}
