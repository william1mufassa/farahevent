'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, toApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResendTicketPage() {
  const t = useTranslations('resend');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [sent, setSent] = useState<null | { tickets_count: number; channels: string[] }>(null);

  const resend = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ tickets_count: number; channels: string[] }>('/tickets/resend', {
          email,
          order_id: orderId,
        })
      ).data,
    onSuccess: (data) => {
      setSent(data);
      toast.success(t('success'));
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <main className="container mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert variant="info">
              <AlertDescription>
                {t('sentSummary', {
                  count: sent.tickets_count,
                  channels: sent.channels.join(' + '),
                })}
              </AlertDescription>
            </Alert>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                resend.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_id">{t('orderLabel')}</Label>
                <Input
                  id="order_id"
                  required
                  placeholder={t('orderPlaceholder')}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={resend.isPending}>
                {resend.isPending ? t('submitting') : t('submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
