'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { bestTextOn } from '@/lib/contrast';
import type { EventDraftDesign } from '@/types/event-draft';

/**
 * Aperçu Design temps réel (CONCEPTION_FRONTEND.md §10.4) : iframe de la vraie
 * landing en mode `?preview=1`. Les couleurs sont poussées en direct
 * (postMessage) ; le template passe par l'URL (reload de l'iframe).
 */
export function DesignPreview({ slug, design }: { slug: string; design: EventDraftDesign }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = `/e/${slug}?preview=1&template=${design.template}`;

  const post = useCallback(() => {
    const text = design.colors.text ?? bestTextOn(design.colors.bg);
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'fe-preview', colors: { ...design.colors, text } },
      window.location.origin,
    );
  }, [design.colors]);

  // Push à chaque changement de couleur.
  useEffect(() => {
    post();
  }, [post]);

  // Re-push quand l'iframe signale qu'elle est prête (évite la course au chargement).
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'fe-preview-ready') post();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [post]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
        <span>Aperçu en direct</span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          Plein écran <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="relative aspect-[4/5] w-full">
        {/* key=template → remonte l'iframe (nouvelle URL) au changement de template */}
        <iframe
          key={design.template}
          ref={iframeRef}
          src={src}
          title="Aperçu de la landing"
          onLoad={post}
          className="absolute inset-0 h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
