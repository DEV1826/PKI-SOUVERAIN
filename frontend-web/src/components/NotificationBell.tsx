import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { adminService, userService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
};

const STORAGE_PREFIX = 'pki_read_notifications_v1';

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readMap, setReadMap] = useState<Record<string, true>>({});

  const storageKey = `${STORAGE_PREFIX}:${user?.id || 'guest'}`;

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setReadMap(JSON.parse(raw));
      else setReadMap({});
    } catch {
      setReadMap({});
    }
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(storageKey, JSON.stringify(readMap));
  }, [readMap, storageKey, user?.id]);

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        if (!user) return;

        if (user.role === 'ADMIN') {
          const [pending, csr] = await Promise.all([
            adminService.getCertificateRequests('PENDING_REVIEW', 0, 25),
            adminService.getCertificateRequests('CSR_SUBMITTED', 0, 25),
          ]);

          const list: NotificationItem[] = [];

          (pending.items || []).forEach((r: any) => {
            list.push({
              id: `admin-${r.id}-PENDING_REVIEW`,
              title: 'Nouvelle demande a verifier',
              message: `${r.commonName || r.email || r.id} attend votre validation.`,
              timestamp: r.submittedAt || r.updatedAt || new Date().toISOString(),
            });
          });

          (csr.items || []).forEach((r: any) => {
            list.push({
              id: `admin-${r.id}-CSR_SUBMITTED`,
              title: 'CSR prete a signer',
              message: `${r.commonName || r.email || r.id} est en attente de signature.`,
              timestamp: r.submittedAt || r.updatedAt || new Date().toISOString(),
            });
          });

          if (mounted) setItems(list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
          return;
        }

        const requests = await userService.getMyRequests();
        const list: NotificationItem[] = (requests || [])
          .filter((r: any) => r.status && r.status !== 'PENDING' && r.status !== 'PENDING_REVIEW')
          .map((r: any) => ({
            id: `user-${r.id}-${r.status}`,
            title: 'Mise a jour de votre demande',
            message: `Demande ${r.id}: statut ${r.status}`,
            timestamp: r.updatedAt || r.submittedAt || new Date().toISOString(),
          }));

        if (mounted) setItems(list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
      } catch {
        if (mounted) setItems([]);
      }
    };

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user]);

  const unreadCount = useMemo(
    () => items.filter((n) => !readMap[n.id]).length,
    [items, readMap]
  );

  const markAllRead = () => {
    const next: Record<string, true> = { ...readMap };
    items.forEach((n) => {
      next[n.id] = true;
    });
    setReadMap(next);
  };

  const markOneRead = (id: string) => setReadMap((prev) => ({ ...prev, [id]: true }));

  if (!user) return null;

  return (
    <div className="relative">
      <button
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{unreadCount} non lues</p>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              onClick={markAllRead}
            >
              <CheckCheck size={14} />
              Tout lire
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Aucune notification pour le moment.
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const unread = !readMap[n.id];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => markOneRead(n.id)}
                        className={`w-full border-b border-neutral-100 px-4 py-3 text-left transition last:border-b-0 dark:border-neutral-800 ${
                          unread
                            ? 'bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-950/25 dark:hover:bg-indigo-950/35'
                            : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{n.title}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              unread
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}
                          >
                            {unread ? 'non lu' : 'lu'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{n.message}</p>
                        <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{new Date(n.timestamp).toLocaleString('fr-FR')}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
