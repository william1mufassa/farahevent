import { RevealWords } from './RevealWords';

/** Titre de section PULSE : sans extra-bold surdimensionné, mots au scroll. */
export function SectionTitle({ title }: { title: string }) {
  return (
    <RevealWords
      text={title}
      className="mb-12 font-display text-[clamp(2.25rem,7vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-[var(--color-text)]"
    />
  );
}
