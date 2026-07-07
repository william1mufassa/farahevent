import dynamic from 'next/dynamic';
import type { TemplateKey } from '@/types/event-config';
import type { TemplateSections } from './types';

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

const spotlight: TemplateSections = {
  Hero: dynamic(() => import('./spotlight/Hero').then((m) => m.SpotlightHero)),
  About: dynamic(() => import('./spotlight/About').then((m) => m.SpotlightAbout)),
  Speakers: dynamic(() => import('./spotlight/Speakers').then((m) => m.SpotlightSpeakers)),
  Programme: dynamic(() => import('./spotlight/Programme').then((m) => m.SpotlightProgramme)),
  Formulas: dynamic(() => import('./spotlight/Formulas').then((m) => m.SpotlightFormulas)),
  Stats: dynamic(() => import('./spotlight/Stats').then((m) => m.SpotlightStats)),
  Faq: dynamic(() => import('./spotlight/Faq').then((m) => m.SpotlightFaq)),
  Partners: dynamic(() => import('./spotlight/Partners').then((m) => m.SpotlightPartners)),
};

export const TEMPLATE_BY_KEY: Record<TemplateKey, TemplateSections> = {
  A: keynote,
  B: spotlight,
  C: keynote, // TODO — DIRECTOR'S CUT
  D: keynote, // TODO — PULSE
};

export function getTemplate(key: TemplateKey): TemplateSections {
  return TEMPLATE_BY_KEY[key] ?? keynote;
}
