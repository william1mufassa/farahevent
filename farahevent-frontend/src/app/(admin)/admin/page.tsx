'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CreditCard, QrCode, Users } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { useAuth } from '@/contexts/auth';
import type { EventAdmin, ManualPaymentAdmin } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { admin } = useAuth();

  const { data: events } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => (await adminApi.get<EventAdmin[]>('/admin/events/')).data,
  });

  const { data: payments } = useQuery({
    queryKey: ['admin', 'manual-payments'],
    queryFn: async () =>
      (await adminApi.get<ManualPaymentAdmin[]>('/admin/manual-payments/?status=pending')).data,
    enabled: admin?.role !== 'agent',
  });

  const pending = payments?.length ?? 0;
  const activeEvents = events?.filter((e) => e.status === 'open' || e.status === 'live').length ?? 0;
  const totalEvents = events?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue, {admin?.first_name}. Voici un apercu de votre activite.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/events">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Evenements</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">{activeEvents} actif(s)</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/manual-payments">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paiements en attente</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pending}</div>
              <p className="text-xs text-muted-foreground">A valider / rejeter</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/scan">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Scanner QR</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Scan</div>
              <p className="text-xs text-muted-foreground">Controle des entrees</p>
            </CardContent>
          </Card>
        </Link>

        {admin?.role === 'super_admin' && (
          <Link href="/admin/admins">
            <Card className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Collaborateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Gerer</div>
                <p className="text-xs text-muted-foreground">Comptes admin</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {payments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Derniers paiements en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {p.participant.first_name} {p.participant.last_name}
                    </span>
                    <span className="mx-2 text-muted-foreground">-</span>
                    <span>{p.event.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {p.order.amount.toLocaleString()} {p.order.currency}
                    </span>
                    <Badge variant="outline">{p.operator.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
