import path from "path";
import { createSeedDatabase } from "./seed";
import type { CmsDatabase, AuditLog } from "./types";
import {
  initDurableStore,
  loadStoreAsync,
  saveStoreAsync,
  readJsonFile,
  writeWithBackup,
} from "@/lib/persist/durable-json";
import { STORE_KEYS } from "@/lib/db/kv-store";
import { isPostgresEnabled } from "@/lib/db/client";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cms-db.json");

let writeLock: Promise<void> = Promise.resolve();

function normalizeCms(db: CmsDatabase): CmsDatabase {
  const seed = createSeedDatabase();
  db.site = { ...seed.site, ...db.site };
  if (!Array.isArray(db.leaders)) db.leaders = seed.leaders;
  if (!Array.isArray(db.media)) {
    (db as CmsDatabase & { media?: unknown[] }).media = [];
  }
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
  if (!Array.isArray(db.donations)) db.donations = [];
  return db;
}

async function ensureDb(): Promise<CmsDatabase> {
  await initDurableStore();

  // Postgres-first
  if (isPostgresEnabled()) {
    const fromDb = await loadStoreAsync<CmsDatabase>(STORE_KEYS.cms, DB_PATH);
    if (fromDb && typeof fromDb === "object") {
      return normalizeCms(fromDb);
    }
  }

  // File / durable sync read
  const fromFile = readJsonFile<CmsDatabase>(DB_PATH);
  if (fromFile && typeof fromFile === "object") {
    return normalizeCms(fromFile);
  }

  // Truly first boot — seed once only
  console.warn("[cms] No cms-db found — seeding once (will not overwrite later)");
  const seed = createSeedDatabase();
  await persist(seed);
  return seed;
}

async function persist(db: CmsDatabase): Promise<void> {
  db.updatedAt = new Date().toISOString();
  await saveStoreAsync(STORE_KEYS.cms, db, DB_PATH);
  // Keep file mirror via writeWithBackup path too
  try {
    writeWithBackup(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    /* ignore */
  }
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn);
  writeLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function getDb(): Promise<CmsDatabase> {
  return withLock(() => ensureDb());
}

export async function saveDb(db: CmsDatabase): Promise<CmsDatabase> {
  return withLock(async () => {
    await persist(db);
    return db;
  });
}

export async function getCollection<K extends keyof CmsDatabase>(
  name: K
): Promise<CmsDatabase[K]> {
  const db = await getDb();
  return db[name];
}

export async function updateSite(
  patch: Partial<CmsDatabase["site"]>,
  actor = "admin"
): Promise<CmsDatabase["site"]> {
  return withLock(async () => {
    const db = await ensureDb();
    db.site = { ...db.site, ...patch };
    pushAudit(db, actor, "Updated site settings", "site");
    await persist(db);
    return db.site;
  });
}

export async function updateStats(
  patch: Partial<CmsDatabase["stats"]>,
  actor = "admin"
): Promise<CmsDatabase["stats"]> {
  return withLock(async () => {
    const db = await ensureDb();
    db.stats = { ...db.stats, ...patch };
    pushAudit(db, actor, "Updated national statistics", "stats");
    await persist(db);
    return db.stats;
  });
}

export async function replaceCollection<K extends keyof CmsDatabase>(
  name: K,
  data: CmsDatabase[K],
  actor = "admin"
): Promise<CmsDatabase[K]> {
  return withLock(async () => {
    const db = await ensureDb();
    db[name] = data;
    pushAudit(db, actor, `Replaced collection: ${String(name)}`, String(name));
    await persist(db);
    return db[name];
  });
}

type ArrayCollection = {
  [K in keyof CmsDatabase]: CmsDatabase[K] extends Array<infer _U> ? K : never;
}[keyof CmsDatabase];

function isArrayCollection(name: string, db: CmsDatabase): name is ArrayCollection {
  return Array.isArray(db[name as keyof CmsDatabase]);
}

export async function upsertItem(
  collection: string,
  item: Record<string, unknown>,
  actor = "admin"
): Promise<Record<string, unknown>> {
  return withLock(async () => {
    const db = await ensureDb();
    if (!isArrayCollection(collection, db)) {
      throw new Error(`Collection "${collection}" is not a list`);
    }
    const list = db[collection] as Array<Record<string, unknown>>;
    const id = String(item.id ?? `${Date.now()}`);
    // Match by id only (name matching caused wrong updates when renaming leaders)
    const existingIdx = list.findIndex((x) => String(x.id) === id);
    const now = new Date().toISOString();
    const record: Record<string, unknown> = {
      ...item,
      id,
      updatedAt: now,
      createdAt: (existingIdx >= 0 && list[existingIdx].createdAt) || item.createdAt || now,
    };

    // Leaders: always keep a level so About page filters work
    if (collection === "leaders" && !record.level) {
      record.level = "national";
    }

    // Events: any positive price is paid (payment options on public site)
    if (collection === "events") {
      const price = Math.max(0, Math.round(Number(record.price) || 0));
      record.price = price;
      record.capacity = Math.max(0, Math.round(Number(record.capacity) || 0)) || 100;
      record.registered = Math.max(0, Math.round(Number(record.registered) || 0));
      record.isFree = price <= 0;
      if (price <= 0) record.price = 0;
      if (!record.status) record.status = "upcoming";
      if (!record.type) record.type = "physical";
    }

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...record };
      pushAudit(db, actor, `Updated item in ${collection}`, collection, id);
    } else {
      list.unshift(record);
      pushAudit(db, actor, `Created item in ${collection}`, collection, id);
    }

    await persist(db);

    // Verify write landed (helps catch disk failures early)
    const verifyRaw = await fs.readFile(DB_PATH, "utf-8");
    const verify = JSON.parse(verifyRaw) as CmsDatabase;
    const verifyList = verify[collection as keyof CmsDatabase];
    if (!Array.isArray(verifyList) || !verifyList.some((x: { id?: string }) => String(x.id) === id)) {
      throw new Error("Save verification failed — data was not written to disk");
    }

    return record;
  });
}

export async function deleteItem(
  collection: string,
  id: string,
  actor = "admin"
): Promise<boolean> {
  return withLock(async () => {
    const db = await ensureDb();
    if (!isArrayCollection(collection, db)) {
      throw new Error(`Collection "${collection}" is not a list`);
    }
    const list = db[collection] as Array<Record<string, unknown>>;
    const before = list.length;
    const next = list.filter((x) => String(x.id) !== id);
    (db as unknown as Record<string, unknown>)[collection] = next;
    if (next.length < before) {
      pushAudit(db, actor, `Deleted item from ${collection}`, collection, id);
      await persist(db);
      return true;
    }
    return false;
  });
}

export async function getItem(
  collection: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  if (!isArrayCollection(collection, db)) return null;
  const list = db[collection] as Array<Record<string, unknown>>;
  return (
    list.find(
      (x) =>
        String(x.id) === id ||
        String(x.slug || "") === id ||
        String(x.name || "") === id
    ) || null
  );
}

export async function registerMedia(
  entry: {
    url: string;
    filename: string;
    size?: number;
    type?: string;
    alt?: string;
  },
  actor = "admin"
): Promise<Record<string, unknown>> {
  return withLock(async () => {
    const db = await ensureDb();
    if (!Array.isArray((db as CmsDatabase & { media?: unknown[] }).media)) {
      (db as CmsDatabase & { media: unknown[] }).media = [];
    }
    const media = (db as CmsDatabase & { media: Record<string, unknown>[] }).media;
    const record = {
      id: `media-${Date.now()}`,
      url: entry.url,
      filename: entry.filename,
      size: entry.size || 0,
      type: entry.type || "image",
      alt: entry.alt || entry.filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    media.unshift(record);
    // Keep last 500 media items
    (db as CmsDatabase & { media: unknown[] }).media = media.slice(0, 500);
    pushAudit(db, actor, `Uploaded media ${entry.filename}`, "media", record.id);
    await persist(db);
    return record;
  });
}

export async function resetDatabase(actor = "super_admin"): Promise<CmsDatabase> {
  return withLock(async () => {
    const seed = createSeedDatabase();
    pushAudit(seed, actor, "Database reset to seed data", "system");
    await persist(seed);
    return seed;
  });
}

function pushAudit(
  db: CmsDatabase,
  user: string,
  action: string,
  collection?: string,
  itemId?: string
) {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user,
    action,
    collection,
    itemId,
    createdAt: new Date().toISOString(),
  };
  // Keep long history — never drop past activity casually
  db.auditLogs = [log, ...(db.auditLogs || [])].slice(0, 5000);
  // Mirror into durable activity log (separate file, survives CMS resets better)
  try {
    // lazy require to avoid circular init issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logActivity } = require("@/lib/activity/log") as typeof import("@/lib/activity/log");
    logActivity({
      kind: "cms",
      action,
      actor: user,
      target: itemId || collection,
      meta: { collection },
    });
  } catch {
    /* ignore */
  }
}

export async function exportDatabase(): Promise<string> {
  const db = await getDb();
  return JSON.stringify(db, null, 2);
}

export async function importDatabase(
  json: string,
  actor = "super_admin"
): Promise<CmsDatabase> {
  return withLock(async () => {
    const parsed = JSON.parse(json) as CmsDatabase;
    if (!parsed.site || !parsed.programs) {
      throw new Error("Invalid CMS database format");
    }
    pushAudit(parsed, actor, "Imported full database backup");
    await persist(parsed);
    return parsed;
  });
}
