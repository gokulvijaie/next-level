"use client";

/**
 * Notification centre: NotificationBell + UnreadNotificationBadge +
 * NotificationDropdown + NotificationList + NotificationItem +
 * NotificationPreferences.
 *
 * Transport: 60-second polling of /api/notifications (a cached Next proxy
 * of Drupal's feed). Polling was chosen over SSE/WebSockets deliberately —
 * it needs no persistent-connection infrastructure, is CDN/cache friendly,
 * survives serverless deployments, and sub-minute latency is ample for
 * commerce notifications. The Drupal webhook also invalidates the
 * "notifications" tag, so the polled payload is always fresh.
 *
 * Read/hidden state and preferences are per-device (localStorage) for the
 * anonymous storefront; the Drupal table already models per-user rows
 * (uid), which activate once authentication is added.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Settings2, Trash2 } from "lucide-react";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { StoreNotification } from "@/types/storefront";
import { cn } from "@/lib/utils";

const READ_KEY = "sg_notifications_read";
const HIDDEN_KEY = "sg_notifications_hidden";
const PREFS_KEY = "sg_notification_prefs";

const TYPE_LABELS: Record<string, string> = {
  new_product: "New products",
  price_drop: "Price drops",
  restock: "Back in stock",
  promo: "Promotions",
  announcement: "Announcements",
};

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-200)));
  } catch {
    /* storage unavailable */
  }
}

export function NotificationBell() {
  const prefs = useMotionPrefs();
  const { items: wishlist } = useWishlist();
  const [open, setOpen] = React.useState(false);
  const [showPrefs, setShowPrefs] = React.useState(false);
  const [notifications, setNotifications] = React.useState<StoreNotification[]>([]);
  const [read, setRead] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [muted, setMuted] = React.useState<Set<string>>(new Set());
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Poll the feed.
  React.useEffect(() => {
    setRead(readSet(READ_KEY));
    setHidden(readSet(HIDDEN_KEY));
    setMuted(readSet(PREFS_KEY));
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (active) setNotifications(data.notifications ?? []);
      } catch {
        /* keep last known list */
      }
    };
    load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Close on outside click / Escape.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const wishlistIds = React.useMemo(() => new Set(wishlist.map((w) => w.id)), [wishlist]);
  const visible = notifications.filter((n) => !hidden.has(n.id) && !muted.has(n.type));
  const unread = visible.filter((n) => !read.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set([...read, ...visible.map((n) => n.id)]);
    setRead(next);
    writeSet(READ_KEY, next);
  };
  const markRead = (id: string) => {
    const next = new Set(read).add(id);
    setRead(next);
    writeSet(READ_KEY, next);
  };
  const remove = (id: string) => {
    const next = new Set(hidden).add(id);
    setHidden(next);
    writeSet(HIDDEN_KEY, next);
  };
  const toggleMuted = (type: string) => {
    const next = new Set(muted);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setMuted(next);
    writeSet(PREFS_KEY, next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications, ${unread} unread`}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden />
        <UnreadNotificationBadge count={unread} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={prefs.reduced ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefs.reduced ? 0 : -6 }}
            transition={{ duration: prefs.reduced ? 0 : 0.18, ease: EASE }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,90vw)] overflow-hidden rounded-[1.5rem] border bg-card text-card-foreground shadow-card-hover"
          >
            <header className="flex items-center justify-between gap-2 border-b p-3">
              <h2 className="text-sm font-bold">Notifications</h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={!unread}
                  className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-primary hover:bg-secondary disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden /> Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrefs((s) => !s)}
                  aria-pressed={showPrefs}
                  aria-label="Notification preferences"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-secondary"
                >
                  <Settings2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {showPrefs ? (
              <NotificationPreferences muted={muted} onToggle={toggleMuted} />
            ) : (
              <NotificationList
                notifications={visible}
                read={read}
                wishlistIds={wishlistIds}
                onRead={markRead}
                onRemove={remove}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function UnreadNotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function NotificationList({
  notifications,
  read,
  wishlistIds,
  onRead,
  onRemove,
}: {
  notifications: StoreNotification[];
  read: Set<string>;
  wishlistIds: Set<string>;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!notifications.length) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        You&apos;re all caught up — no notifications.
      </p>
    );
  }
  return (
    <ul className="max-h-96 overflow-y-auto">
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          isRead={read.has(n.id)}
          inWishlist={Boolean(n.product && wishlistIds.has(n.product))}
          onRead={() => onRead(n.id)}
          onRemove={() => onRemove(n.id)}
        />
      ))}
    </ul>
  );
}

export function NotificationItem({
  notification,
  isRead,
  inWishlist,
  onRead,
  onRemove,
}: {
  notification: StoreNotification;
  isRead: boolean;
  inWishlist: boolean;
  onRead: () => void;
  onRemove: () => void;
}) {
  const date = new Date(notification.created * 1000);
  const Wrapper = notification.url ? "a" : "div";
  return (
    <li className={cn("group flex gap-2 border-b p-3 last:border-0", !isRead && "bg-primary/5")}>
      <Wrapper
        {...(notification.url ? { href: notification.url } : {})}
        onClick={onRead}
        className="min-w-0 flex-1"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          {!isRead && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
          <span className="truncate">{notification.title}</span>
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{notification.body}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {inWishlist && (
            <span className="mr-2 rounded-sm bg-destructive/10 px-1 font-semibold text-destructive">
              In your wishlist
            </span>
          )}
          <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>
        </p>
      </Wrapper>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Delete notification: ${notification.title}`}
        className="h-8 w-8 shrink-0 rounded-sm text-muted-foreground opacity-60 hover:bg-secondary hover:text-destructive"
      >
        <Trash2 className="mx-auto h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

export function NotificationPreferences({
  muted,
  onToggle,
}: {
  muted: Set<string>;
  onToggle: (type: string) => void;
}) {
  return (
    <fieldset className="p-3">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Show notifications about
      </legend>
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <label key={type} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!muted.has(type)}
            onChange={() => onToggle(type)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
