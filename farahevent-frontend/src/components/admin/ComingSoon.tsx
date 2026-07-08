import type { LucideIcon } from 'lucide-react';

/** Placeholder pour les modules admin livrés dans les lots suivants. */
export function ComingSoon({
  title,
  icon: Icon,
  note,
}: {
  title: string;
  icon: LucideIcon;
  note?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {note ?? 'Module en cours de construction — disponible prochainement.'}
      </p>
    </div>
  );
}
