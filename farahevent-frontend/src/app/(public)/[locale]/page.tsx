'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { formatEventDate } from '@/lib/utils';
import type { EventListItem } from '@/types/event';
import { Link, useRouter } from '@/lib/i18n/navigation';
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
    <main className="container mx-auto px-4 py-16">
      <header className="mb-14 space-y-3 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mx-auto max-w-md text-lg opacity-60">{t('subtitle')}</p>
      </header>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {isError && <p className="text-center text-destructive">{t('loadError')}</p>}

      {data && data.length === 0 && (
        <p className="text-center opacity-60">{t('empty')}</p>
      )}

      {data && data.length > 1 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Link key={e.id} href={`/e/${e.slug}`} className="group">
              <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--color-bg)] transition hover:shadow-xl">
                {e.cover_image_url ? (
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={e.cover_image_url}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center bg-black/[0.03]">
                    <Calendar className="h-10 w-10 opacity-20" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {e.mode}
                    </Badge>
                    {e.is_featured && (
                      <Badge className="bg-[var(--color-primary,#e63946)] text-xs text-white">
                        {t('featured')}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-lg font-bold">{e.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm opacity-60">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatEventDate(e.date)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm opacity-50">
                    <MapPin className="h-3.5 w-3.5" />
                    {[e.location, e.venue_city].filter(Boolean).join(' — ') || t('venueTbc')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
