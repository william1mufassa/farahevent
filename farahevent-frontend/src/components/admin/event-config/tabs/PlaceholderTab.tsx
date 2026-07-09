/** Onglet à venir (Lot 7b). */
export function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Onglet livré au Lot 7b.</p>
    </div>
  );
}
