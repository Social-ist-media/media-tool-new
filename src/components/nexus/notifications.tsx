import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { listNotifications, markNotificationsRead } from "@/lib/nexus/data";
import type { NotificationItem } from "@/lib/nexus/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = () =>
    listNotifications()
      .then(setItems)
      .catch(() => setItems([]));

  useEffect(() => {
    void load();
  }, []);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal" />
        )}
      </Button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50 w-80 rounded-[16px] border border-border bg-surface p-2 shadow-[var(--shadow-soft)] md:bottom-auto md:left-auto md:right-0 md:top-12">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Inbox of the workspace</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-muted hover:text-fg"
                onClick={async () => {
                  await markNotificationsRead({ data: { all: true } });
                  await load();
                }}
              >
                Mark read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.href || "/dashboard"}
                    onClick={async () => {
                      if (!n.read) await markNotificationsRead({ data: { id: n.id } });
                      setOpen(false);
                    }}
                    className={cn(
                      "block rounded-[12px] px-3 py-2.5 hover:bg-surface-2",
                      !n.read && "bg-surface-2/60",
                    )}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
