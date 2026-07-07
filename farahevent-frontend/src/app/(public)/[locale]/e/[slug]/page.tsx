'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EventDetailPublic, FormulaPublic } from '@/types/event';
import { formatEventDate, formatFCFA } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';
import { ThemeWrapper } from '@/components/theme/ThemeWrapper';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

/**
 * Landing provisoire (client, React Query). Remplacée au Lot 2 par la
 * composition RSC + templates (voir CONCEPTION_FRONTEND.md §4.3).
 */
export default function EventDetailPage() {
  const t = useTranslations('event');
  const params = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['event', params.slug],
    queryFn: async () => (await api.get<EventDetailPublic>(`/events/${params.slug}`)).data,
    enabled: Boolean(params.slug),
  });

  if (isLoading) {
    return (
      <main className="container mx-auto space-y-6 px-4 py-10">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-32 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>{t('notFoundTitle')}</AlertTitle>
          <AlertDescription>{t('notFoundDesc')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <ThemeWrapper template={data.template}>
      <main className="container mx-auto px-4 py-10">
        {data.cover_image_url && (
          <div className="mb-8 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.cover_image_url} alt="" className="h-64 w-full object-cover sm:h-96" />
          </div>
        )}

        <header className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{data.mode}</Badge>
            <Badge variant="outline">{data.status}</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{data.name}</h1>
          <p className="text-lg text-muted-foreground">{formatEventDate(data.date)}</p>
          {(data.location || data.venue_city) && (
            <p className="text-muted-foreground">
              {[data.location, data.venue_city].filter(Boolean).join(' — ')}
            </p>
          )}
        </header>

        {data.description && (
          <section className="prose mb-10 max-w-none whitespace-pre-line text-base leading-relaxed">
            {data.description}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('formulasTitle')}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.formulas.map((f) => (
              <FormulaCard key={f.id} formula={f} eventSlug={data.slug} />
            ))}
          </div>
          {data.formulas.length === 0 && (
            <p className="text-muted-foreground">{t('noFormulas')}</p>
          )}
        </section>
      </main>
      <ChatbotWidget eventSlug={data.slug} />
    </ThemeWrapper>
  );
}

function FormulaCard({ formula, eventSlug }: { formula: FormulaPublic; eventSlug: string }) {
  const t = useTranslations('event');
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{formula.name}</CardTitle>
          <Badge variant={formula.channel === 'online' ? 'default' : 'secondary'}>
            {formula.channel}
          </Badge>
        </div>
        <CardDescription>{formula.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4">
        <div className="text-3xl font-bold">{formatFCFA(formula.price)}</div>
        {formula.advantages && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{formula.advantages}</p>
        )}
        <div className="mt-auto">
          {formula.is_sold_out ? (
            <Button className="w-full" disabled>
              {t('soldOut')}
            </Button>
          ) : (
            <Link href={`/e/${eventSlug}/acheter?formula=${formula.id}`}>
              <Button className="w-full">{t('choose')}</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
