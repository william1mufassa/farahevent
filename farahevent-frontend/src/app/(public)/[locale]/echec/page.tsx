'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FailurePage() {
  const t = useTranslations('failure');
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? '';
  const messageKey = reason === 'FAILED' || reason === 'REJECTED' ? reason : 'default';

  return (
    <main className="container mx-auto max-w-xl px-4 py-16">
      <Card className="border-destructive/40">
        <CardHeader className="flex-row items-center gap-3">
          <XCircle className="h-10 w-10 text-destructive" />
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{t(messageKey)}</p>
          <Link href="/">
            <Button className="w-full">{t('backToTickets')}</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
