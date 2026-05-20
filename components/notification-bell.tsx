"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationRead, markAllRead } from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  booking_created:   "📅",
  booking_cancelled: "⚠️",
  booking_confirmed: "✅",
  system:            "🔔",
};

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleNotificationClick(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setOpen(false);
    startTransition(() => markNotificationRead(id));
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(() => markAllRead());
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <Bell
          className={`w-5 h-5 text-muted-foreground ${unread > 0 ? "bell-ring" : ""}`}
          strokeWidth={1.8}
        />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground ring-2 ring-background animate-in zoom-in duration-200">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <div className="text-2xl mb-2">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              items.map((n) => {
                const icon = TYPE_ICON[n.type] ?? "🔔";
                const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${!n.read ? "bg-primary/5" : ""}`}
                    onClick={() => handleNotificationClick(n.id)}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.read ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
                    </div>
                  </div>
                );

                return n.href ? (
                  <Link key={n.id} href={n.href} className="block cursor-pointer">{content}</Link>
                ) : (
                  <div key={n.id} className="cursor-pointer">{content}</div>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/10 text-center">
              <span className="text-xs text-muted-foreground">{items.length} notification{items.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
