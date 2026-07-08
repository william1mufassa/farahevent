'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RevenuePoint } from '@/types/admin-stats';
import { formatFCFA } from '@/lib/utils';
import { compactFcfa, useChartInk } from './chart-theme';
import { ChartTooltip } from './ChartTooltip';

/** Évolution des revenus — aire, série unique, crosshair au survol. */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const ink = useChartInk();
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Évolution des revenus</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ink.series} stopOpacity={0.26} />
                <stop offset="100%" stopColor={ink.series} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={ink.grid} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: ink.baseline }}
              tick={{ fill: ink.axis, fontSize: 11 }}
              tickFormatter={(d) => format(new Date(d), 'dd/MM')}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.axis, fontSize: 11 }}
              width={52}
              tickFormatter={compactFcfa}
            />
            <Tooltip
              cursor={{ stroke: ink.baseline, strokeWidth: 1 }}
              content={
                <ChartTooltip
                  valueFormatter={formatFCFA}
                  labelFormatter={(l) => format(new Date(l), 'dd MMMM', { locale: fr })}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={ink.series}
              strokeWidth={2}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
