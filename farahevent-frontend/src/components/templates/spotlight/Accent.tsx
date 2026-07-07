import { cn } from '@/lib/utils';

export function Accent({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-1 w-12 rounded-full bg-[var(--color-primary)]', className)}
    />
  );
}
