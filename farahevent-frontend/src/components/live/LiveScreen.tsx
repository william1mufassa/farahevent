'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getLiveSession, liveSocketUrl } from '@/lib/api/live';
import { useWebSocket } from '@/lib/ws/useWebSocket';
import { useLiveSessionStore } from '@/stores/useLiveSession';
import type { LiveServerMessage, LiveSession, LiveSessionState } from '@/types/live';
import {
  EjectedState,
  EndedState,
  InvalidState,
  LiveLoading,
  PlayingState,
  WaitingState,
} from './LiveStates';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

/**
 * Orchestrateur de la page live (CONCEPTION_FRONTEND.md §9) : fetch de la
 * session (React Query), branchement du WebSocket (transitions d'état,
 * audience, éjection), toasts de connexion, et machine à 5 états.
 * `mockState` (query `?mockState=`) force un état pour l'aperçu en dev.
 */
export function LiveScreen({
  token,
  mockState,
}: {
  token: string | null;
  mockState: LiveSessionState | null;
}) {
  const t = useTranslations('live');
  const queryClient = useQueryClient();

  const state = useLiveSessionStore((s) => s.state);
  const hydrate = useLiveSessionStore((s) => s.hydrate);
  const setState = useLiveSessionStore((s) => s.setState);
  const setViewerCount = useLiveSessionStore((s) => s.setViewerCount);
  const eject = useLiveSessionStore((s) => s.eject);

  const queryEnabled = IS_MOCK || Boolean(token);

  const {
    data: session,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['live-session', token],
    queryFn: () => getLiveSession(token ?? ''),
    enabled: queryEnabled,
    retry: false,
    // Poll uniquement en attente : détecte le passage en direct sans WS.
    refetchInterval: (query) => (query.state.data?.state === 'waiting' ? 15000 : false),
  });

  // Hydrate le store : override mock prioritaire, sinon session, sinon invalide.
  useEffect(() => {
    if (mockState) {
      hydrate(mockState, session?.viewer_count ?? 1287);
      return;
    }
    if (!token && !IS_MOCK) {
      setState('invalid');
      return;
    }
    if (isError) {
      setState('invalid');
      return;
    }
    if (!session) return;
    if (useLiveSessionStore.getState().state === 'ejected') return; // éjection terminale
    hydrate(session.state, session.viewer_count);
  }, [session, isError, mockState, token, hydrate, setState]);

  // WebSocket — coupé en mock/preview.
  const wsUrl = !IS_MOCK && !mockState && token ? liveSocketUrl(token) : null;
  const { status } = useWebSocket(wsUrl, {
    enabled: Boolean(wsUrl),
    onMessage: (data) => {
      const msg = data as LiveServerMessage;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;
      switch (msg.type) {
        case 'state':
          setState(msg.state);
          queryClient.setQueryData<LiveSession | undefined>(['live-session', token], (old) =>
            old
              ? {
                  ...old,
                  state: msg.state,
                  stream_url: msg.stream_url ?? old.stream_url,
                  replay_url: msg.replay_url ?? old.replay_url,
                }
              : old,
          );
          break;
        case 'viewers':
          setViewerCount(msg.count);
          break;
        case 'ejected':
          eject(msg.reason ?? null);
          break;
      }
    },
  });

  // Toasts « connexion perdue / rétablie ».
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'open' && status === 'reconnecting') toast.error(t('connectionLost'));
    if (prevStatus.current === 'reconnecting' && status === 'open') toast.success(t('reconnected'));
    prevStatus.current = status;
  }, [status, t]);

  const displayState = mockState ?? state;

  if (!mockState && queryEnabled && isLoading) return <LiveLoading />;

  switch (displayState) {
    case 'playing':
      return session?.stream_url ? (
        <PlayingState session={session} />
      ) : (
        <WaitingState session={session} onRefresh={() => refetch()} />
      );
    case 'waiting':
      return <WaitingState session={session} onRefresh={() => refetch()} />;
    case 'ended':
      return <EndedState session={session} />;
    case 'ejected':
      return <EjectedState />;
    case 'invalid':
    default:
      return <InvalidState session={session} />;
  }
}
