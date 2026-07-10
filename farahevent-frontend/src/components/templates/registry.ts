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

const directorsCut: TemplateSections = {
  Hero: dynamic(() => import('./directors-cut/Hero').then((m) => m.DirectorsCutHero)),
  About: dynamic(() => import('./directors-cut/About').then((m) => m.DirectorsCutAbout)),
  Speakers: dynamic(() => import('./directors-cut/Speakers').then((m) => m.DirectorsCutSpeakers)),
  Programme: dynamic(() => import('./directors-cut/Programme').then((m) => m.DirectorsCutProgramme)),
  Formulas: dynamic(() => import('./directors-cut/Formulas').then((m) => m.DirectorsCutFormulas)),
  Stats: dynamic(() => import('./directors-cut/Stats').then((m) => m.DirectorsCutStats)),
  Faq: dynamic(() => import('./directors-cut/Faq').then((m) => m.DirectorsCutFaq)),
  Partners: dynamic(() => import('./directors-cut/Partners').then((m) => m.DirectorsCutPartners)),
};

const pulse: TemplateSections = {
  Hero: dynamic(() => import('./pulse/Hero').then((m) => m.PulseHero)),
  About: dynamic(() => import('./pulse/About').then((m) => m.PulseAbout)),
  Speakers: dynamic(() => import('./pulse/Speakers').then((m) => m.PulseSpeakers)),
  Programme: dynamic(() => import('./pulse/Programme').then((m) => m.PulseProgramme)),
  Formulas: dynamic(() => import('./pulse/Formulas').then((m) => m.PulseFormulas)),
  Stats: dynamic(() => import('./pulse/Stats').then((m) => m.PulseStats)),
  Faq: dynamic(() => import('./pulse/Faq').then((m) => m.PulseFaq)),
  Partners: dynamic(() => import('./pulse/Partners').then((m) => m.PulsePartners)),
};

export const TEMPLATE_BY_KEY: Record<TemplateKey, TemplateSections> = {
  A: keynote,
  B: spotlight,
  C: directorsCut,
  D: pulse,
};

export function getTemplate(key: TemplateKey): TemplateSections {
  return TEMPLATE_BY_KEY[key] ?? keynote;
}
