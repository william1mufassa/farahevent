'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  deactivate: 'bg-red-100 text-red-800',
  status_change: 'bg-purple-100 text-purple-800',
  validate: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-red-100 text-red-800',
};

function actionColor(action: string): string {
  const suffix = action.split('.').pop() ?? '';
  return ACTION_COLORS[suffix] ?? 'bg-gray-100 text-gray-800';
}

export default function AuditLogsPage() {
  const [actionPrefix, setActionPrefix] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', actionPrefix, resourceType, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (actionPrefix) params.set('action_prefix', actionPrefix);
      if (resourceType) params.set('resource_type', resourceType);
      return (await adminApi.get<AuditLog[]>(`/admin/audit-logs/?${params}`)).data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Prefix action</Label>
              <Input
                placeholder="event., manual_payment., admin..."
                value={actionPrefix}
                onChange={(e) => {
                  setActionPrefix(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type de ressource</Label>
              <Input
                placeholder="event, formula, manual_payment..."
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetch()}>
                Rafraichir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : !logs?.length ? (
        <p className="text-muted-foreground">Aucune entree.</p>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Admin</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Ressource</th>
                <th className="p-3 font-medium">IP</th>
                <th className="p-3 font-medium">Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('fr')}
                  </td>
                  <td className="p-3 text-xs">{log.admin_email ?? '-'}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {log.resource_type ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {log.resource_type}
                        </Badge>
                        {log.resource_id && (
                          <span className="ml-2 font-mono text-muted-foreground">
                            {log.resource_id.slice(-8)}
                          </span>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {log.ip_address ?? '-'}
                  </td>
                  <td className="p-3 max-w-md">
                    {log.payload && (
                      <code className="block truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.payload)}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          Precedent
        </Button>
        <span className="text-xs text-muted-foreground">
          {offset + 1} - {offset + (logs?.length ?? 0)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset(offset + limit)}
          disabled={(logs?.length ?? 0) < limit}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
