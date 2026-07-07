import dynamic from 'next/dynamic';
import type { TemplateKey } from '@/types/event-config';
import type { TemplateSections } from './types';

/**
 * Registry des templates : imports dynamiques par section pour que le
 * visiteur ne télécharge que le bundle du template actif.
 * A = KEYNOTE, B = SPOTLIGHT (Lot 4), C = DIRECTOR'S CUT, D = PULSE (Lot 9).
 */
const keynote: TemplateSections = {
  Hero: dynamic(() => import('./keynote/Hero').then((m) => m.KeynoteHero)),
  About: dynamic(() => import('./keynote/About').then((m) => m.KeynoteAbout)),
  Speakers: dynamic(() => import('./keynote/Speakers').then((m) => m.KeynoteSpeakers)),
  Programme: dynamic(() => import('./keynote/Programme').then((m) => m.KeynoteProgramme)),
  Formulas: dynamic(() => import('./keynote/Formulas').then((m) => m.KeynoteFormulas)),
  Stats: dynamic(() => import('./keynote/Stats').then((m) => m.KeynoteStats)),
  Faq: dynamic(() => import('./keynote/Faq').then((m) => m.KeynoteFaq)),
  Partners: dynamic(() => import('./keynote/Partners').then((m) => m.KeynotePartners)),
};

export const TEMPLATE_BY_KEY: Record<TemplateKey, TemplateSections> = {
  A: keynote,
  B: keynote, // TODO Lot 4 — SPOTLIGHT
  C: keynote, // TODO Lot 9 — DIRECTOR'S CUT
  D: keynote, // TODO Lot 9 — PULSE
};

export function getTemplate(key: TemplateKey): TemplateSections {
  return TEMPLATE_BY_KEY[key] ?? keynote;
}
