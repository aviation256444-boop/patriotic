"use client";

import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Calendar,
  CreditCard,
  Shield,
  Info,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useNotifications,
  relativeTime,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function typeIcon(type: string) {
  switch (type) {
    case "event":
      return Calendar;
    case "payment":
      return CreditCard;
    case "membership":
      return Shield;
    case "warning":
      return AlertTriangle;
    case "success":
      return Sparkles;
    case "system":
      return Bell;
    default:
      return Info;
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "event":
      return "info" as const;
    case "payment":
    case "success":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "membership":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { items, unread, loading, error, refresh, markRead, markAllRead } =
    useNotifications(30000);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Live feed
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Personal alerts from your account, tickets, membership, and events —
            not demo placeholders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 && (
            <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Badge variant={unread > 0 ? "success" : "outline"}>
          {unread} unread
        </Badge>
        <span className="text-muted-foreground">{items.length} in feed</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="flex justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Building your notification feed…
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When you register, buy tickets, or membership updates, alerts appear here automatically."
          actionHref="/events"
          actionLabel="Browse events"
        />
      )}

      <ul className="space-y-2">
        {items.map((n) => {
          const Icon = typeIcon(n.type);
          const body = (
            <article
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                n.read
                  ? "border-border/50 bg-card"
                  : "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    n.read
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/15 text-emerald-600"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm leading-snug">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(n.createdAt)}
                      </span>
                      <Badge variant={typeBadge(n.type)} className="capitalize text-[10px]">
                        {n.type}
                      </Badge>
                    </div>
                  </div>
                  {!n.read && (
                    <p className="text-[10px] font-semibold text-emerald-600 mt-2 uppercase tracking-wide">
                      New
                    </p>
                  )}
                </div>
              </div>
            </article>
          );

          if (n.link) {
            return (
              <li key={n.id}>
                <Link
                  href={n.link}
                  onClick={() => {
                    if (!n.read) void markRead(n.id);
                  }}
                  className="block hover:opacity-95"
                >
                  {body}
                </Link>
              </li>
            );
          }

          return (
            <li key={n.id}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  if (!n.read) void markRead(n.id);
                }}
              >
                {body}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
