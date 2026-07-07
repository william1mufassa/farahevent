'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';

import { api } from '@/lib/api';
import type { OrderPublicStatus } from '@/types/order';
import { formatFCFA } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ConfirmationPage() {
  const t = useTranslations('confirmation');
  const orderId = useSearchParams().get('order_id');

  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await api.get<OrderPublicStatus>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
  });

  return (
    <main className="container mx-auto max-w-xl px-4 py-16">
      <Card className="border-emerald-200">
        <CardHeader className="flex-row items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{t('body')}</p>
          {data && (
            <div className="rounded-md bg-muted p-4 text-sm">
              <div>
                <strong>{t('event')} :</strong> {data.event.name}
              </div>
              <div>
                <strong>{t('formula')} :</strong> {data.formula.name}
              </div>
              <div>
                <strong>{t('amount')} :</strong> {formatFCFA(data.amount)}
              </div>
              <div>
                <strong>{t('reference')} :</strong>{' '}
                <code>{data.id.slice(-8).toUpperCase()}</code>
              </div>
            </div>
          )}
          <Link href="/billet">
            <Button variant="outline" className="w-full">
              {t('notReceived')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
