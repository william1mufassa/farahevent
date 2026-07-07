import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  const tCommon = await getTranslations('common');

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight">404</h1>
      <p className="text-xl font-semibold">{t('title')}</p>
      <p className="max-w-md text-muted-foreground">{t('desc')}</p>
      <Link href="/">
        <Button variant="outline">{tCommon('backHome')}</Button>
      </Link>
    </main>
  );
}
