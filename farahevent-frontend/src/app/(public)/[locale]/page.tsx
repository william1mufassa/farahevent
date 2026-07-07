'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatEventDate } from '@/lib/utils';
import type { EventListItem } from '@/types/event';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const t = useTranslations('home');
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get<EventListItem[]>('/events/')).data,
  });

  useEffect(() => {
    if (data && data.length === 1) {
      router.replace(`/e/${data[0].slug}`);
    }
  }, [data, router]);

  return (
    <main className="container mx-auto px-4 py-12">
      <header className="mb-10 space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
      </header>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      )}

      {isError && <p className="text-center text-destructive">{t('loadError')}</p>}

      {data && data.length === 0 && (
        <p className="text-center text-muted-foreground">{t('empty')}</p>
      )}

      {data && data.length > 1 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Link key={e.id} href={`/e/${e.slug}`}>
              <Card className="h-full transition hover:shadow-lg">
                {e.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.cover_image_url}
                    alt=""
                    className="h-40 w-full rounded-t-lg object-cover"
                  />
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{e.mode}</Badge>
                    {e.is_featured && <Badge>{t('featured')}</Badge>}
                  </div>
                  <CardTitle className="mt-2 text-xl">{e.name}</CardTitle>
                  <CardDescription>{formatEventDate(e.date)}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {[e.location, e.venue_city].filter(Boolean).join(' — ') || t('venueTbc')}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
