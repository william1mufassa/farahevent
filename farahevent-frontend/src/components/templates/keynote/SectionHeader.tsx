import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { Rule } from './Rule';

/** En-tête de section KEYNOTE : ligne animée + titre serif. */
export function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <Rule className="mb-12" />
      <ScrollReveal>
        <h2 className="mb-10 font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2>
      </ScrollReveal>
    </>
  );
}
