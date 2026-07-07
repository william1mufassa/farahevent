import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { cn } from '@/lib/utils';
import { Rule } from './Rule';

/**
 * Shell deux colonnes KEYNOTE (CDC §2.1) : titre 40 % / contenu 60 %,
 * côté du titre alterné entre sections via `flip`.
 */
export function KeynoteSection({
  id,
  title,
  flip = false,
  children,
}: {
  id: string;
  title: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <Rule className="mb-12" />
      <div className="grid gap-8 lg:grid-cols-5 lg:gap-16">
        <div className={cn('lg:col-span-2', flip && 'lg:order-2')}>
          <ScrollReveal>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2>
          </ScrollReveal>
        </div>
        <div className={cn('lg:col-span-3', flip && 'lg:order-1')}>{children}</div>
      </div>
    </section>
  );
}
