'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radio, QrCode, Ticket, Wallet, Clock } from 'lucide-react';

import { getDashboardStats } from '@/lib/api/admin/stats';
import { useAdminUi } from '@/stores/useAdminUi';
import { useAuth } from '@/contexts/auth';
import { cn, formatFCFA } from '@/lib/utils';
import type { StatsPeriod } from '@/types/admin-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { SalesChart } from '@/components/admin/dashboard/SalesChart';
import { CountryChart } from '@/components/admin/dashboard/CountryChart';
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed';

const PERIODS: Array<{ value: StatsPeriod; label: string }> = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: 'all', label: 'Tout' },
];

export default function AdminDashboardPage() {
  const { admin } = useAuth();
  const selectedEventId = useAdminUi((s) => s.selectedEventId);
  const [period, setPeriod] = useState<StatsPeriod>('30d');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats', selectedEventId, period],
    queryFn: () => getDashboardStats(selectedEventId, period),
  });

  const n = (v: number) => v.toLocaleString('fr-FR');
  const k = stats?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue, {admin?.first_name}. Aperçu de votre activité.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                period === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !k ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div
            className={cn(
              'grid gap-4 sm:grid-cols-2',
              k.live_viewers !== null ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4',
            )}
          >
            <KpiCard icon={Ticket} label="Billets vendus" value={n(k.tickets_sold)} />
            <KpiCard icon={QrCode} label="Entrées scannées" value={n(k.scans)} />
            <KpiCard icon={Wallet} label="Revenus" value={formatFCFA(k.revenue)} />
            <KpiCard
              icon={Clock}
              label="Manuels en attente"
              value={n(k.pending_manual)}
              sub={k.pending_manual > 0 ? 'à traiter' : 'rien à traiter'}
              accent={k.pending_manual > 0 ? 'warning' : undefined}
            />
            {k.live_viewers !== null && (
              <KpiCard
                icon={Radio}
                label="Spectateurs live"
                value={n(k.live_viewers)}
                sub="en direct"
                accent="live"
              />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <RevenueChart data={stats.revenue_series} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SalesChart data={stats.sales_by_formula} />
                <CountryChart data={stats.sales_by_country} />
              </div>
            </div>
            <ActivityFeed items={stats.activity} />
          </div>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
