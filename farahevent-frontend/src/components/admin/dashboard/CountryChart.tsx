'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SalesByCountry } from '@/types/admin-stats';
import { useChartInk } from './chart-theme';
import { ChartTooltip } from './ChartTooltip';

/** Ventes par pays — barres horizontales classées, série unique. */
export function CountryChart({ data }: { data: SalesByCountry[] }) {
  const ink = useChartInk();
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Ventes par pays</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            barCategoryGap="22%"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke={ink.grid} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.axis, fontSize: 12 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="country"
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.axis, fontSize: 12 }}
              width={96}
            />
            <Tooltip
              cursor={{ fill: ink.grid, fillOpacity: 0.3 }}
              content={<ChartTooltip valueFormatter={(v) => `${v.toLocaleString('fr-FR')} billets`} />}
            />
            <Bar dataKey="count" fill={ink.series} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
