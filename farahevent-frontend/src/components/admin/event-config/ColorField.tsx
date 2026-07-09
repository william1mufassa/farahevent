'use client';

/** Sélecteur de couleur : pastille native + hex synchronisés. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-9 w-28 rounded-md border border-input bg-background px-2 font-mono text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
        />
      </div>
    </div>
  );
}
