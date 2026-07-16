'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Radio, QrCode, Ticket, Wallet, Clock, LayoutDashboard } from 'lucide-react';

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

  const pageContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  };

  return (
    <motion.div
      variants={pageContainerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-5"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenue, <span className="font-semibold text-foreground">{admin?.first_name}</span>. Voici l&apos;aperçu de votre activité.
            </p>
          </div>
        </div>
        
        {/* Period Selector Toggle */}
        <div className="relative inline-flex rounded-xl border border-white/20 bg-white/60 p-1 shadow-md backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/60">
          {PERIODS.map((p) => {
            const isActive = period === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className="relative rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="activePeriod"
                    className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(
                  'relative z-20 transition-colors duration-200',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {isLoading || !k ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <motion.div
            variants={itemVariants}
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
              sub={k.pending_manual > 0 ? 'à traiter d\'urgence' : 'aucun en attente'}
              accent={k.pending_manual > 0 ? 'warning' : undefined}
            />
            {k.live_viewers !== null && (
              <KpiCard
                icon={Radio}
                label="Spectateurs live"
                value={n(k.live_viewers)}
                sub="diffusion en direct"
                accent="live"
              />
            )}
          </motion.div>

          {/* Charts & Feed Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <RevenueChart data={stats.revenue_series} />
              
              <div className="grid gap-6 sm:grid-cols-2">
                <SalesChart data={stats.sales_by_formula} />
                <CountryChart data={stats.sales_by_country} />
              </div>
            </div>
            
            <ActivityFeed items={stats.activity} />
          </div>
        </>
      )}
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
