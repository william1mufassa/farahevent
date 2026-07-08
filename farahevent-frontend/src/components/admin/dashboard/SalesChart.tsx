'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SalesByFormula } from '@/types/admin-stats';
import { useChartInk } from './chart-theme';
import { ChartTooltip } from './ChartTooltip';

/** Ventes par formule — barres verticales, série unique (magnitude). */
export function SalesChart({ data }: { data: SalesByFormula[] }) {
  const ink = useChartInk();
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Ventes par formule</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} stroke={ink.grid} />
            <XAxis
              dataKey="formula"
              tickLine={false}
              axisLine={{ stroke: ink.baseline }}
              tick={{ fill: ink.axis, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.axis, fontSize: 12 }}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: ink.grid, fillOpacity: 0.3 }}
              content={<ChartTooltip valueFormatter={(v) => `${v.toLocaleString('fr-FR')} billets`} />}
            />
            <Bar dataKey="count" fill={ink.series} radius={[4, 4, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
