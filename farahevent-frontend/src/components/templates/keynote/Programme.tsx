'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

/**
 * Programme KEYNOTE : tableau épuré heure/contenu, heure sticky, alternance
 * de fonds, ligne active (au centre du viewport) soulignée d'un accent
 * primaire à gauche.
 */
export function KeynoteProgramme({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const sessions = [...config.programme].sort((a, b) => a.sort_order - b.sort_order);
  const speakerById = new Map(config.speakers.map((s) => [s.id, s.name]));
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-session-id]'));
    if (rows.length === 0) return;

    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sessionId;
          if (!id) continue;
          if (entry.isIntersecting) intersecting.add(id);
          else intersecting.delete(id);
        }
        const first = rows.find((row) => intersecting.has(row.dataset.sessionId ?? ''));
        setActiveId(first?.dataset.sessionId ?? null);
      },
      // bande centrale de l'écran : la ligne qui la traverse devient active
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [sessions.length]);

  return (
    <section
      id={SECTION_IDS.programme}
      className="container mx-auto max-w-4xl scroll-mt-20 px-4 py-16 sm:py-24"
    >
      <SectionHeader title={t('programmeTitle')} />

      <div ref={listRef}>
        {sessions.map((session, i) => {
          const active = session.id === activeId;
          const names = session.speaker_ids
            .map((id) => speakerById.get(id))
            .filter((n): n is string => Boolean(n));
          const description = l(session.description, locale);

          return (
            <ScrollReveal key={session.id}>
              <div
                data-session-id={session.id}
                className="grid grid-cols-[84px_1fr] gap-4 px-4 py-5 transition-colors duration-300 sm:grid-cols-[110px_1fr] sm:gap-8"
                style={{
                  borderLeft: active
                    ? '3px solid var(--color-primary)'
                    : '3px solid transparent',
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
                    : i % 2 === 1
                      ? 'color-mix(in srgb, currentColor 3%, transparent)'
                      : undefined,
                }}
              >
                <div className="sticky top-24 self-start">
                  <p className="font-medium tabular-nums">{session.start_time}</p>
                  {session.end_time && (
                    <p className="text-xs tabular-nums opacity-50">{session.end_time}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{l(session.title, locale)}</h3>
                  {description && (
                    <p className="mt-1 text-sm leading-relaxed opacity-70">{description}</p>
                  )}
                  {names.length > 0 && (
                    <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[var(--color-primary)]">
                      {names.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
