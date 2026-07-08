import type { Metadata } from 'next';
import { LiveScreen } from '@/components/live/LiveScreen';
import type { LiveSessionState } from '@/types/live';

export const metadata: Metadata = { robots: { index: false } };

const MOCK_STATES: readonly LiveSessionState[] = [
  'invalid',
  'waiting',
  'playing',
  'ejected',
  'ended',
];

/**
 * Page live (CONCEPTION_FRONTEND.md §9) : `/[locale]/live?token=JWT`.
 * RSC mince — lit les query params et délègue au client (WS + player).
 * `?mockState=` force un état pour l'aperçu en dev (ignoré en prod sans mock).
 */
export default function LivePage({
  searchParams,
}: {
  params: { locale: string };
  searchParams: { token?: string; mockState?: string };
}) {
  const token = searchParams.token ?? null;
  const mockState = MOCK_STATES.includes(searchParams.mockState as LiveSessionState)
    ? (searchParams.mockState as LiveSessionState)
    : null;

  return <LiveScreen token={token} mockState={mockState} />;
}
