import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { cn } from '@/lib/utils';

/** Titre de section DIRECTOR'S CUT : serif surdimensionné, débordant à gauche. */
export function SectionTitle({ title, className }: { title: string; className?: string }) {
  return (
    <ScrollReveal>
      <h2
        className={cn(
          'mb-12 font-serif text-[clamp(2.75rem,9vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.03em] text-white',
          className,
        )}
      >
        {title}
      </h2>
    </ScrollReveal>
  );
}
