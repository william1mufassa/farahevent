'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/i18n/navigation';
import type { OrderPublicStatus } from '@/types/order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function PendingPage() {
  const t = useTranslations('pending');
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      // Arrête le polling quand le statut est terminal
      if (s === 'PAID' || s === 'MANUAL_VALIDATED') return false;
      if (s === 'FAILED' || s === 'REJECTED' || s === 'REFUNDED') return false;
      return 5000;
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data.status === 'PAID' || data.status === 'MANUAL_VALIDATED') {
      router.replace(`/confirmation?order_id=${data.id}`);
    } else if (data.status === 'FAILED' || data.status === 'REJECTED') {
      router.replace(`/echec?order_id=${data.id}&reason=${data.status}`);
    }
  }, [data, router]);

  if (!orderId) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertDescription>{t('missingOrder')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {isLoading || !data ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <>
              <p>
                {t('currentStatus')} <strong>{data.status}</strong>
              </p>
              <p>
                {data.event.name} — {data.formula.name}
              </p>
              <p>{t('autoRefresh')}</p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
