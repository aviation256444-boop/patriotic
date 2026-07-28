/**
 * Append-only activity log — logins, account changes, CMS edits, payments.
 * Never auto-wiped (only super admin export/clear).
 */

import { randomUUID } from "crypto";
import { join } from "path";
import { ensureDir, readJsonFile, writeWithBackup } from "@/lib/persist/atomic-file";

export type ActivityKind =
  | "login"
  | "register"
  | "user_create"
  | "user_update"
  | "user_password"
  | "cms"
  | "payment"
  | "ticket"
  | "upload"
  | "system"
  | "other";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  action: string;
  actor?: string;
  target?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

type ActivityDb = { entries: ActivityEntry[] };

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "activity-log.json");
const MAX_ENTRIES = 5000;

function load(): ActivityDb {
  ensureDir(DATA_DIR);
  const parsed = readJsonFile<ActivityDb>(FILE);
  if (parsed && Array.isArray(parsed.entries)) return parsed;
  const empty: ActivityDb = { entries: [] };
  writeWithBackup(FILE, JSON.stringify(empty, null, 2));
  return empty;
}

function save(db: ActivityDb) {
  writeWithBackup(FILE, JSON.stringify(db, null, 2));
}

export function logActivity(input: {
  kind: ActivityKind;
  action: string;
  actor?: string;
  target?: string;
  meta?: Record<string, unknown>;
}): ActivityEntry {
  const db = load();
  const entry: ActivityEntry = {
    id: randomUUID(),
    kind: input.kind,
    action: input.action,
    actor: input.actor,
    target: input.target,
    meta: input.meta,
    createdAt: new Date().toISOString(),
  };
  db.entries.unshift(entry);
  if (db.entries.length > MAX_ENTRIES) {
    db.entries = db.entries.slice(0, MAX_ENTRIES);
  }
  save(db);
  return entry;
}

export function listActivity(limit = 100): ActivityEntry[] {
  return load().entries.slice(0, Math.max(1, Math.min(500, limit)));
}

export function exportActivity(): ActivityDb {
  return load();
}

export function importActivity(data: unknown): number {
  const incoming = data as ActivityDb;
  if (!incoming || !Array.isArray(incoming.entries)) {
    throw new Error("Invalid activity backup");
  }
  const db = load();
  const seen = new Set(db.entries.map((e) => e.id));
  let added = 0;
  for (const e of incoming.entries) {
    if (!e?.id || seen.has(e.id)) continue;
    db.entries.push(e);
    seen.add(e.id);
    added += 1;
  }
  db.entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (db.entries.length > MAX_ENTRIES) {
    db.entries = db.entries.slice(0, MAX_ENTRIES);
  }
  save(db);
  return added;
}
