import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query';
import { fontVariables } from '@/lib/fonts';
import { routing, type Locale } from '@/lib/i18n/routing';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'FarahEvent — Billetterie',
  description: 'Achetez votre billet en toute simplicité.',
};

export default function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  return (
    <html lang={locale} suppressHydrationWarning className={`${fontVariables} scroll-smooth`}>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
