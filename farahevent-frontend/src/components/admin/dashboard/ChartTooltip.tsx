'use client';

/**
 * Tooltip commun aux graphiques — surface popover, encre texte (jamais la
 * couleur de série pour le texte). Recharts injecte active/payload/label en
 * clonant l'élément ; on le passe donc via `content={<ChartTooltip … />}`.
 */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (l: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const heading =
    label != null ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {heading && <p className="mb-1 font-medium text-popover-foreground">{heading}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-medium tabular-nums text-popover-foreground">
          {valueFormatter ? valueFormatter(Number(p.value)) : String(p.value)}
        </p>
      ))}
    </div>
  );
}
