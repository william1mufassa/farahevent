'use client';

import { Suspense, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { getParticipants } from '@/lib/api/admin/participants';
import { useAdminUi } from '@/stores/useAdminUi';
import { formatFCFA } from '@/lib/utils';
import type { ParticipantRow } from '@/types/participant';
import { DataTable, type Column } from '@/components/admin/table/DataTable';
import { Pagination } from '@/components/admin/table/Pagination';
import { StatusBadge } from '@/components/admin/table/StatusBadge';
import { SearchInput, SelectFilter } from '@/components/admin/table/filters';
import { useTableQuery } from '@/components/admin/table/useTableQuery';
import { ParticipantSheet } from '@/components/admin/participants/ParticipantSheet';

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Payé' },
  { value: 'pending', label: 'En attente' },
  { value: 'failed', label: 'Échoué' },
  { value: 'refunded', label: 'Remboursé' },
];

function ParticipantsContent() {
  const { get, setParams } = useTableQuery();
  const selectedEventId = useAdminUi((s) => s.selectedEventId);
  const [selected, setSelected] = useState<ParticipantRow | null>(null);

  const search = get('search');
  const formula = get('formula');
  const country = get('country');
  const status = get('status');
  const page = parseInt(get('page') || '1', 10);
  const pageSize = parseInt(get('pageSize') || '20', 10);
  const sort = get('sort') || 'created_at';
  const dir = (get('dir') || 'desc') as 'asc' | 'desc';

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'participants', selectedEventId, search, formula, country, status, page, pageSize, sort, dir],
    queryFn: () => getParticipants({ eventId: selectedEventId, search, formula, country, status, page, pageSize, sort, dir }),
    placeholderData: keepPreviousData,
  });

  const facets = data?.facets ?? { formulas: [], countries: [] };
  const setFilter = (patch: Record<string, string>) => setParams({ ...patch, page: null });
  const onSort = (key: string) =>
    sort === key
      ? setParams({ dir: dir === 'asc' ? 'desc' : 'asc' })
      : setParams({ sort: key, dir: 'asc' });

  const columns: Column<ParticipantRow>[] = [
    {
      key: 'last_name',
      header: 'Participant',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-foreground">
            {r.first_name} {r.last_name}
          </div>
          <div className="text-xs text-muted-foreground">{r.email}</div>
        </div>
      ),
    },
    { key: 'country', header: 'Pays', sortable: true },
    {
      key: 'formula',
      header: 'Formule',
      render: (r) => (
        <div>
          {r.formula}
          <div className="text-xs text-muted-foreground">
            {r.channel === 'online' ? 'En ligne' : 'Présentiel'}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      align: 'right',
      render: (r) => <span className="tabular-nums">{formatFCFA(r.amount)}</span>,
    },
    { key: 'status', header: 'Statut', align: 'center', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (r) => new Date(r.created_at).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} inscrit(s)</p>
        </div>
        <button
          type="button"
          onClick={() => toast.success('Export en préparation — généré par le serveur.')}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Exporter
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(v) => setFilter({ search: v })} placeholder="Nom, email, réf…" />
        <SelectFilter
          value={formula}
          onChange={(v) => setFilter({ formula: v })}
          allLabel="Toutes formules"
          options={facets.formulas.map((f) => ({ value: f, label: f }))}
        />
        <SelectFilter
          value={country}
          onChange={(v) => setFilter({ country: v })}
          allLabel="Tous pays"
          options={facets.countries.map((c) => ({ value: c, label: c }))}
        />
        <SelectFilter value={status} onChange={(v) => setFilter({ status: v })} allLabel="Tous statuts" options={STATUS_OPTIONS} />
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => r.id}
        sort={{ key: sort, dir }}
        onSort={onSort}
        onRowClick={setSelected}
        loading={isLoading}
        empty="Aucun participant ne correspond à ces filtres."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPage={(p) => setParams({ page: p })}
        onPageSize={(n) => setParams({ pageSize: n, page: null })}
      />

      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense>
      <ParticipantsContent />
    </Suspense>
  );
}
