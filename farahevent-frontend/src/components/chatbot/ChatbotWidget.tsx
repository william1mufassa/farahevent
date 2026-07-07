'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X, HelpCircle, Send } from 'lucide-react';

import { api } from '@/lib/api';

interface Faq {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  eventSlug: string;
  whatsappNumber?: string | null;
}

export function ChatbotWidget({ eventSlug, whatsappNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: faqs } = useQuery({
    queryKey: ['public', 'faqs', eventSlug],
    queryFn: async () => (await api.get<Faq[]>(`/events/${eventSlug}/faqs`)).data,
    enabled: open,
  });

  const filtered =
    search.trim().length === 0
      ? faqs
      : faqs?.filter((f) =>
          `${f.question} ${f.answer}`.toLowerCase().includes(search.toLowerCase()),
        );

  const supportNumber = whatsappNumber ?? '2250000000000';
  const waLink = `https://wa.me/${supportNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Bonjour, j ai une question a propos de l evenement (${eventSlug}).`,
  )}`;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Ouvrir l aide"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-lg border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Une question ?</p>
                <p className="text-xs opacity-80">Nous vous aidons</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/10"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b p-3">
            <input
              type="search"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!faqs ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : filtered?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune reponse dans la FAQ. Contactez-nous via WhatsApp ci-dessous.
              </p>
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
              <Send className="h-4 w-4" /> Ecrire au support sur WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function FaqItem({ faq }: { faq: Faq }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        <span>{faq.question}</span>
        <span className="text-xs text-muted-foreground">{expanded ? '-' : '+'}</span>
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-line">
          {faq.answer}
        </div>
      )}
    </div>
  );
}
