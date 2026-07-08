import { adminApi } from '@/lib/admin-api';
import type { DashboardStats, StatsPeriod } from '@/types/admin-stats';
import { MOCK_DASHBOARD_STATS } from '@/mocks/admin.fixture';

const PERIOD_DAYS: Record<StatsPeriod, number | null> = { '7d': 7, '30d': 30, all: null };

/**
 * KPIs + séries du dashboard (CONCEPTION_FRONTEND.md §10.2).
 * Mock : tronque la série de revenus selon la période.
 */
export async function getDashboardStats(
  eventId: string | null,
  period: StatsPeriod,
): Promise<DashboardStats> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    const days = PERIOD_DAYS[period];
    const revenue_series = days
      ? MOCK_DASHBOARD_STATS.revenue_series.slice(-days)
      : MOCK_DASHBOARD_STATS.revenue_series;
    return { ...MOCK_DASHBOARD_STATS, revenue_series };
  }
  const res = await adminApi.get<DashboardStats>('/admin/stats', {
    params: { event_id: eventId ?? undefined, period },
  });
  return res.data;
}
