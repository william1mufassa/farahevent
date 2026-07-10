'use client';

import { Suspense } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getAuditLogs } from '@/lib/api/admin/audit-logs';
import type { AuditLogRow } from '@/types/audit-log';
import { DataTable, type Column } from '@/components/admin/table/DataTable';
import { Pagination } from '@/components/admin/table/Pagination';
import { SearchInput } from '@/components/admin/table/filters';
import { useTableQuery } from '@/components/admin/table/useTableQuery';

function actionClass(action: string): string {
  const suffix = action.split('.').pop() ?? '';
  if (['validate', 'create'].includes(suffix)) return 'bg-emerald-500/15 text-emerald-600';
  if (['reject', 'deactivate', 'delete', 'refund'].includes(suffix)) return 'bg-red-500/15 text-red-600';
  if (['update', 'status_change'].includes(suffix)) return 'bg-blue-500/15 text-blue-600';
  if (suffix === 'scan') return 'bg-indigo-500/15 text-indigo-600';
  if (suffix === 'send') return 'bg-amber-500/15 text-amber-600';
  return 'bg-muted text-muted-foreground';
}

function ActivityContent() {
  const { get, setParams } = useTableQuery();
  const search = get('search');
  const page = parseInt(get('page') || '1', 10);
  const pageSize = parseInt(get('pageSize') || '20', 10);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', search, page, pageSize],
    queryFn: () => getAuditLogs({ search, page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleString('fr-FR')}
        </span>
      ),
    },
    { key: 'admin_email', header: 'Admin', render: (r) => <span className="text-xs">{r.admin_email ?? '—'}</span> },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 font-mono text-xs font-medium', actionClass(r.action))}>
          {r.action}
        </span>
      ),
    },
    {
      key: 'resource',
      header: 'Ressource',
      render: (r) =>
        r.resource_type ? (
          <span className="text-xs">
            {r.resource_type}
            <span className="ml-1.5 font-mono text-muted-foreground">{r.resource_id?.slice(-6)}</span>
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'ip_address', header: 'IP', render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip_address ?? '—'}</span> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Journal d&apos;activité</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} action(s) enregistrée(s)</p>
      </div>

      <SearchInput value={search} onChange={(v) => setParams({ search: v, page: null })} placeholder="Action, admin, ressource…" />

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty="Aucune action ne correspond."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPage={(p) => setParams({ page: p })}
        onPageSize={(n) => setParams({ pageSize: n, page: null })}
      />
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityContent />
    </Suspense>
  );
}
