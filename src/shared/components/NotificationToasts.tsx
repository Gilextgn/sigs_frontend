import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import type { AdminNotificationRow } from '@/shared/hooks/useAdminNotifications';

interface Toast {
  key: string;
  title: string;
  body: string | null;
  notificationId: number | null;
}

const DISPLAY_MS = 12_000;

/**
 * Message qui surgit à l'écran de l'administrateur dès qu'une action de caisse
 * (encaissement, annulation, clôture…) est faite par un autre acteur. À la
 * connexion, un seul message résume ce qui n'a pas encore été lu.
 */
export function NotificationToasts({
  notifications,
  unread,
  onOpen,
}: {
  notifications: AdminNotificationRow[] | undefined;
  unread: number;
  /** Clic sur un message : ouvre la liste (et marque la notification lue). */
  onOpen: (notificationId: number | null) => void;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!notifications) return;

    if (seen.current === null) {
      // Premier chargement : pas un message par notification ancienne, un résumé.
      seen.current = new Set(notifications.map((n) => n.id));
      if (unread > 0) {
        setToasts([{ key: 'summary', title: `${unread} action(s) de caisse non lue(s)`, body: 'Faites par vos collaborateurs depuis votre dernière visite.', notificationId: null }]);
      }
      return;
    }

    const fresh = notifications.filter((n) => !seen.current!.has(n.id) && !n.read_at);
    fresh.forEach((n) => seen.current!.add(n.id));
    if (fresh.length > 0) {
      setToasts((current) => [...fresh.slice(0, 3).map((n) => ({ key: String(n.id), title: n.title, body: n.body, notificationId: n.id })), ...current].slice(0, 4));
    }
  }, [notifications, unread]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((current) => current.slice(0, -1)), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (key: string) => setToasts((current) => current.filter((toast) => toast.key !== key));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-32px)] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.key} className="flex items-start gap-3 rounded-xl border border-primary/30 bg-surface p-3.5 shadow-2xl animate-[dropdown-in_0.2s_ease-out]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <BellRing className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={() => {
              dismiss(toast.key);
              onOpen(toast.notificationId);
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-sm font-semibold text-ink">{toast.title}</span>
            {toast.body && <span className="mt-0.5 block text-xs text-ink-soft">{toast.body}</span>}
          </button>
          <button type="button" onClick={() => dismiss(toast.key)} aria-label="Fermer" className="rounded p-1 text-ink-soft transition hover:bg-paper hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
