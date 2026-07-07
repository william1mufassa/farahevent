import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query';
import { fontVariables } from '@/lib/fonts';
import { AdminShell } from '@/components/admin/AdminShell';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'FarahEvent — Administration',
  robots: { index: false, follow: false },
};

/**
 * Root layout de la branche admin (hors i18n — français uniquement).
 * Le public a son propre root layout sous (public)/[locale].
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={fontVariables}>
      <body>
        <QueryProvider>
          <AdminShell>{children}</AdminShell>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
