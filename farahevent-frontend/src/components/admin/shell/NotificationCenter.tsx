'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Check, CreditCard, Info, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <>
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            </>
          )}
        </motion.button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-300" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-white/20 bg-white/70 text-card-foreground shadow-2xl backdrop-blur-lg focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right dark:border-slate-800/40 dark:bg-slate-950/70">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <Dialog.Title className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</Dialog.Title>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Tout marquer lu
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fermer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground italic">Aucune notification.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {items.map((n) => <NotifRow key={n.id} n={n} />)}
              </div>
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
        'flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5',
        !n.read && 'bg-primary/5 dark:bg-primary/5',
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <Icon className={cn('h-5 w-5', n.urgent ? 'text-amber-500 animate-bounce' : 'text-muted-foreground')} />
        {!n.read && (
          <span className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/30" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm text-foreground', !n.read ? 'font-bold' : 'font-medium')}>{n.title}</p>
        {n.body && <p className="truncate text-xs text-muted-foreground mt-0.5">{n.body}</p>}
        <p className="mt-1 text-[10px] font-semibold text-muted-foreground/60">
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
