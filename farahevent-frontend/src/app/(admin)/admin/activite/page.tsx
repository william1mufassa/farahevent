'use client';

import { Suspense } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getAuditLogs } from '@/lib/api/admin/audit-logs';
import type { AuditLogRow } from '@/types/audit-log';
import { DataTable, type Column } from '@/components/admin/table/DataTable';
import { Pagination } from '@/components/admin/table/Pagination';
import { SearchInput } from '@/components/admin/table/filters';
import { useTableQuery } from '@/components/admin/table/useTableQuery';

// Simplified human-readable action helper
function formatAction(action: string): string {
  const mapping: Record<string, string> = {
    'admin.auth.login': '🔑 Connexion à l\'espace admin',
    'admin.auth.refresh': '🔄 Prolongation de session admin',
    'admin.event.create': '📅 Création d\'un nouvel événement',
    'admin.event.update': '✏️ Modification des détails d\'un événement',
    'admin.event.status_change': '📢 Changement de statut d\'un événement',
    'admin.payment.validate': '✅ Validation d\'un paiement manuel',
    'admin.payment.reject': '❌ Rejet d\'un paiement manuel',
    'admin.ticket.scan': '🎟️ Scan d\'un billet d\'entrée',
    'admin.ticket.send': '✉️ Envoi d\'un billet par message',
    'admin.order.refund': '🔄 Remboursement d\'un billet',
  };

  if (mapping[action]) return mapping[action];

  // Dynamic sentence generation
  const parts = action.split('.');
  const entity = parts[1] || '';
  const op = parts[2] || '';

  const translation: Record<string, Record<string, string>> = {
    event: {
      create: '📅 Création d\'un nouvel événement',
      update: '✏️ Modification d\'un événement',
      delete: '🗑️ Suppression d\'un événement',
    },
    order: {
      create: '💳 Enregistrement d\'une commande',
      update: '✏️ Modification d\'une commande',
      refund: '🔄 Remboursement d\'une commande',
    },
    ticket: {
      scan: '🎟️ Scan d\'un billet d\'entrée',
      send: '✉️ Envoi d\'un billet',
    },
    participant: {
      create: '👤 Ajout d\'un nouveau participant',
      update: '✏️ Modification d\'un participant',
    },
    payment: {
      validate: '✅ Validation d\'un paiement',
      reject: '❌ Rejet d\'un paiement',
    },
  };

  if (translation[entity] && translation[entity][op]) {
    return translation[entity][op];
  }

  // Fallback
  const entityLabels: Record<string, string> = {
    event: 'événement',
    order: 'commande',
    ticket: 'billet',
    participant: 'participant',
    payment: 'paiement',
    auth: 'connexion',
  };

  const opLabels: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    delete: 'Suppression',
    validate: 'Validation',
    reject: 'Rejet',
    scan: 'Scan',
    send: 'Envoi',
    refund: 'Remboursement',
  };

  const e = entityLabels[entity] || entity;
  const o = opLabels[op] || op;

  return `${o} d'un ${e}`;
}

// Action styling color helper
function actionClass(action: string): string {
  const suffix = action.split('.').pop() ?? '';
  if (['validate', 'create'].includes(suffix)) return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
  if (['reject', 'deactivate', 'delete', 'refund'].includes(suffix)) return 'bg-red-500/10 text-red-600 border border-red-500/20';
  if (['update', 'status_change'].includes(suffix)) return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
  if (suffix === 'scan') return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
  if (suffix === 'send') return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
  return 'bg-muted text-muted-foreground border border-muted/50';
}

// Human-readable Resource type mapper
function formatResource(type: string | null): string {
  if (!type) return '—';
  const mapping: Record<string, string> = {
    event: '📅 Événement',
    formula: '🏷️ Formule',
    participant: '👤 Participant',
    order: '💳 Commande',
    manual_payment: '💵 Paiement Manuel',
    ticket: '🎟️ Billet',
  };
  return mapping[type] || type;
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
      header: 'Moment',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(r.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
          </span>
        </div>
      ),
    },
    { 
      key: 'admin_email', 
      header: 'Auteur', 
      render: (r) => {
        const email = r.admin_email || 'Système';
        const prefix = email.split('@')[0];
        return (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {prefix.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">{prefix}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{email}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'action',
      header: 'Action effectuée',
      render: (r) => (
        <span className={cn('inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm', actionClass(r.action))}>
          {formatAction(r.action)}
        </span>
      ),
    },
    {
      key: 'resource',
      header: 'Ressource concernée',
      render: (r) =>
        r.resource_type ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {formatResource(r.resource_type)}
            </span>
            {r.resource_id && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground" title={r.resource_id}>
                #{r.resource_id.slice(-6)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Journal d&apos;activité</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} action(s) d&apos;administration enregistrée(s)</p>
        </div>
      </div>

      <div className="relative rounded-xl border border-white/20 bg-white/60 p-4 shadow-lg backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/60">
        <SearchInput 
          value={search} 
          onChange={(v) => setParams({ search: v, page: null })} 
          placeholder="Rechercher une action, un admin, une ressource..." 
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/70">
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty="Aucune action ne correspond."
        />
      </div>

      <div className="relative rounded-xl border border-white/20 bg-white/60 p-4 shadow-lg backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/60">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPage={(p) => setParams({ page: p })}
          onPageSize={(n) => setParams({ pageSize: n, page: null })}
        />
      </div>
    </motion.div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityContent />
    </Suspense>
  );
}
