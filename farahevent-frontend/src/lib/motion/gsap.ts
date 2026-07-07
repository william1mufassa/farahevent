'use client';

/**
 * Point d'import unique et paresseux de GSAP + ScrollTrigger.
 * GSAP n'entre jamais dans le bundle initial : les templates l'appellent
 * seulement quand useMotionProfile() l'autorise ('full', parfois 'reduced').
 */

export interface GsapBundle {
  gsap: typeof import('gsap')['gsap'];
  ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'];
}

let bundle: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!bundle) {
    bundle = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, scrollTriggerModule]) => {
        gsapModule.gsap.registerPlugin(scrollTriggerModule.ScrollTrigger);
        return { gsap: gsapModule.gsap, ScrollTrigger: scrollTriggerModule.ScrollTrigger };
      },
    );
  }
  return bundle;
}
