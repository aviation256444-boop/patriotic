/**
 * User notifications — durable (Postgres when DATABASE_URL set).
 * Supports targeted users + broadcasts, read state per user.
 */

import { randomUUID } from "crypto";
import { join } from "path";
import {
  readJsonFile,
  writeWithBackup,
  initDurableStore,
} from "@/lib/persist/durable-json";
import { STORE_KEYS } from "@/lib/db/kv-store";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "event"
  | "payment"
  | "membership"
  | "system";

export type NotificationAudience = "user" | "all" | "members" | "admins";

export type AppNotification = {
  id: string;
  /** Stable key to avoid duplicate algorithmic/event notifications */
  sourceKey?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  audience: NotificationAudience;
  userId?: string;
  userEmail?: string;
  /** User ids or emails who marked this read */
  readBy: string[];
  createdAt: string;
  meta?: Record<string, unknown>;
};

type NotificationsDb = { items: AppNotification[] };

const FILE = join(process.cwd(), "data", "notifications.json");
const MAX = 3000;

function ensureDb(): NotificationsDb {
  void initDurableStore();
  void STORE_KEYS.notifications;
  const parsed = readJsonFile<NotificationsDb>(FILE);
  if (parsed && Array.isArray(parsed.items)) return parsed;
  const empty: NotificationsDb = { items: [] };
  writeWithBackup(FILE, JSON.stringify(empty, null, 2));
  return empty;
}

function saveDb(db: NotificationsDb) {
  writeWithBackup(FILE, JSON.stringify(db, null, 2));
}

function normEmail(e?: string) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

export function listAllNotifications(): AppNotification[] {
  return ensureDb().items.slice();
}

export function createNotification(input: {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  audience?: NotificationAudience;
  userId?: string;
  userEmail?: string;
  sourceKey?: string;
  meta?: Record<string, unknown>;
}): AppNotification {
  const db = ensureDb();
  if (input.sourceKey) {
    const existing = db.items.find((n) => n.sourceKey === input.sourceKey);
    if (existing) return existing;
  }

  const item: AppNotification = {
    id: randomUUID(),
    sourceKey: input.sourceKey,
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type || "info",
    link: input.link,
    audience: input.audience || (input.userId || input.userEmail ? "user" : "all"),
    userId: input.userId,
    userEmail: normEmail(input.userEmail) || undefined,
    readBy: [],
    createdAt: new Date().toISOString(),
    meta: input.meta,
  };

  db.items.unshift(item);
  if (db.items.length > MAX) db.items = db.items.slice(0, MAX);
  saveDb(db);
  return item;
}

export function isNotificationForUser(
  n: AppNotification,
  userId?: string,
  userEmail?: string,
  role?: string
): boolean {
  const email = normEmail(userEmail);
  if (n.audience === "all") return true;
  if (n.audience === "members") {
    const r = String(role || "member");
    return true; // all logged-in accounts are part of the movement
  }
  if (n.audience === "admins") {
    const r = String(role || "").toLowerCase();
    return (
      r === "admin" ||
      r === "super_admin" ||
      r === "superadmin" ||
      r === "regional_admin" ||
      r === "district_admin"
    );
  }
  // user-targeted
  if (n.userId && userId && n.userId === userId) return true;
  if (n.userEmail && email && n.userEmail === email) return true;
  return false;
}

export function isReadBy(
  n: AppNotification,
  userId?: string,
  userEmail?: string
): boolean {
  const email = normEmail(userEmail);
  const keys = [userId, email].filter(Boolean) as string[];
  return n.readBy.some((k) => keys.includes(k) || keys.includes(normEmail(k)));
}

export function markNotificationRead(
  id: string,
  userId?: string,
  userEmail?: string
): AppNotification | null {
  const db = ensureDb();
  const idx = db.items.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  const keys = [userId, normEmail(userEmail)].filter(Boolean) as string[];
  const n = db.items[idx];
  const next = new Set(n.readBy);
  for (const k of keys) next.add(k);
  n.readBy = Array.from(next);
  db.items[idx] = n;
  saveDb(db);
  return n;
}

export function markAllReadForUser(userId?: string, userEmail?: string, role?: string) {
  const db = ensureDb();
  const keys = [userId, normEmail(userEmail)].filter(Boolean) as string[];
  let count = 0;
  for (const n of db.items) {
    if (!isNotificationForUser(n, userId, userEmail, role)) continue;
    if (isReadBy(n, userId, userEmail)) continue;
    const next = new Set(n.readBy);
    for (const k of keys) next.add(k);
    n.readBy = Array.from(next);
    count++;
  }
  saveDb(db);
  return count;
}
