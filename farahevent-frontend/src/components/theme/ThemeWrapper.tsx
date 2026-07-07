'use client';

import type { EventTemplate } from '@/types/event';

/**
 * Applique le template A ou B en scopant les CSS variables via un attribut data.
 * Le CSS globals.css définit les variables sous `[data-template='B']`.
 */
export function ThemeWrapper({
  template,
  children,
}: {
  template: EventTemplate;
  children: React.ReactNode;
}) {
  return (
    <div data-template={template} className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
