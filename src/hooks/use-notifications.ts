"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export type UiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
  origin?: string;
};

export function useNotifications(pollMs = 45000) {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<UiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setItems([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (user.id) q.set("userId", user.id);
      if (user.email) q.set("userEmail", user.email);
      q.set("limit", "60");
      const res = await fetch(`/api/notifications?${q}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load notifications");
      setItems(data.items || []);
      setUnread(Number(data.unreadCount ?? data.unread ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const t = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(t);
  }, [user, refresh, pollMs]);

  const markRead = useCallback(
    async (id: string) => {
      if (!user) return;
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            actorId: user.id,
            actorEmail: user.email,
          }),
        });
      } catch {
        void refresh();
      }
    },
    [user, refresh]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markAll: true,
          actorId: user.id,
          actorEmail: user.email,
        }),
      });
    } catch {
      void refresh();
    }
  }, [user, refresh]);

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-UG", {
    month: "short",
    day: "numeric",
  });
}
