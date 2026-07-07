import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { Accent } from './Accent';

export function SectionHeader({ title }: { title: string }) {
  return (
    <ScrollReveal>
      <div className="mb-12">
        <Accent className="mb-4" />
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>
    </ScrollReveal>
  );
}
