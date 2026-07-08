'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Check, CreditCard, Info, QrCode, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { selectUnreadCount, useNotifications } from '@/stores/useNotifications';
import type { AdminNotification, AdminNotificationKind } from '@/types/admin-stats';

const ICON: Record<AdminNotificationKind, typeof Bell> = {
  manual_pending: CreditCard,
  order_paid: Check,
  scan_alert: QrCode,
  system: Info,
};

/**
 * Cloche + panneau latéral chronologique lu/non-lu (CONCEPTION_FRONTEND.md
 * §10.1). Alimenté par le store (seed fetch + push WS).
 */
export function NotificationCenter() {
  const items = useNotifications((s) => s.items);
  const unread = useNotifications(selectUnreadCount);
  const markAllRead = useNotifications((s) => s.markAllRead);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card text-card-foreground shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Notifications</Dialog.Title>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Tout marquer lu
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fermer"
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Aucune notification.</p>
            ) : (
              items.map((n) => <NotifRow key={n.id} n={n} />)
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NotifRow({ n }: { n: AdminNotification }) {
  const router = useRouter();
  const markRead = useNotifications((s) => s.markRead);
  const Icon = ICON[n.kind];

  const body = (
    <div
      className={cn(
        'flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors',
        n.href && 'cursor-pointer hover:bg-muted/60',
        !n.read && 'bg-primary/[0.04]',
      )}
    >
      <div className="relative mt-0.5">
        <Icon className={cn('h-5 w-5', n.urgent ? 'text-amber-500' : 'text-muted-foreground')} />
        {!n.read && (
          <span className="absolute -left-1.5 top-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{n.title}</p>
        {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(n.at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  );

  const onActivate = () => {
    markRead(n.id);
    if (n.href) router.push(n.href);
  };

  if (!n.href) {
    return (
      <button type="button" className="block w-full" onClick={onActivate}>
        {body}
      </button>
    );
  }

  return (
    <Dialog.Close asChild>
      <button type="button" className="block w-full" onClick={onActivate}>
        {body}
      </button>
    </Dialog.Close>
  );
}
