'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Download, RotateCcw, TrendingUp, Wallet } from 'lucide-react';

import { getFinance, refundTransaction } from '@/lib/api/admin/finance';
import { toApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/utils';
import type { Transaction } from '@/types/finance';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { DataTable, type Column } from '@/components/admin/table/DataTable';
import { StatusBadge } from '@/components/admin/table/StatusBadge';

export default function FinancesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'finance'], queryFn: getFinance });

  const refund = useMutation({
    mutationFn: (id: string) => refundTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] });
      toast.success('Transaction remboursée.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const s = data?.summary;

  const columns: Column<Transaction>[] = [
    { key: 'ref', header: 'Réf.', render: (t) => <span className="font-mono text-xs">{t.ref}</span> },
    { key: 'participant', header: 'Participant' },
    {
      key: 'formula',
      header: 'Formule',
      render: (t) => (
        <span>
          {t.formula}
          <span className="ml-1.5 text-xs text-muted-foreground">
            {t.payment_mode === 'manual' ? 'Manuel' : 'Digital'}
          </span>
        </span>
      ),
    },
    { key: 'amount', header: 'Montant', align: 'right', render: (t) => <span className="tabular-nums">{formatFCFA(t.amount)}</span> },
    { key: 'status', header: 'Statut', align: 'center', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (t) =>
        t.status === 'paid' ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Rembourser ${formatFCFA(t.amount)} à ${t.participant} ?`)) refund.mutate(t.id);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium transition hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" /> Rembourser
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finances</h1>
          <p className="text-sm text-muted-foreground">Revenus, remboursements et transactions.</p>
        </div>
        <button
          type="button"
          onClick={() => toast.success('Export comptable en préparation — généré par le serveur.')}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export comptable
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Revenus bruts" value={s ? formatFCFA(s.gross) : '—'} />
        <KpiCard icon={TrendingUp} label="Revenus nets" value={s ? formatFCFA(s.net) : '—'} sub="après remboursements" />
        <KpiCard icon={RotateCcw} label="Remboursés" value={s ? formatFCFA(s.refunded) : '—'} />
        <KpiCard
          icon={Clock}
          label="En attente"
          value={s ? formatFCFA(s.pending) : '—'}
          sub={s && s.pending > 0 ? 'à encaisser' : undefined}
          accent={s && s.pending > 0 ? 'warning' : undefined}
        />
      </div>

      <h2 className="text-sm font-semibold">Transactions</h2>
      <DataTable
        columns={columns}
        rows={data?.transactions ?? []}
        rowKey={(t) => t.id}
        loading={isLoading}
        empty="Aucune transaction."
      />
    </div>
  );
}
