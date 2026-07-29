/**
 * Durable JSON persistence with two backends:
 * 1) Postgres (DATABASE_URL) — survives Render redeploys
 * 2) Local JSON files — local development / fallback
 *
 * Sync API matches existing stores: reads hit in-memory cache when using Postgres;
 * writes update cache immediately and flush to Postgres on a serial queue.
 * Call `await initDurableStore()` at process start (instrumentation.ts).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  copyFileSync,
  readdirSync,
} from "fs";
import { dirname, join, basename } from "path";
import { isPostgresEnabled } from "@/lib/db/client";
import { ensureKvSchema, kvGetJson, kvSetJson, STORE_KEYS } from "@/lib/db/kv-store";

const memory = new Map<string, unknown>();
let initialized = false;
let initPromise: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();

/** Map absolute/relative file paths → store keys */
export function storeKeyFromPath(filePath: string): string {
  const base = basename(filePath).replace(/\.json$/i, "");
  switch (base) {
    case "users":
      return STORE_KEYS.users;
    case "cms-db":
      return STORE_KEYS.cms;
    case "tickets":
      return STORE_KEYS.tickets;
    case "withdrawals":
      return STORE_KEYS.withdrawals;
    case "activity-log":
      return STORE_KEYS.activity;
    case "notifications":
      return STORE_KEYS.notifications;
    default:
      return base;
  }
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function fileWriteAtomic(filePath: string, content: string) {
  ensureDir(dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, content, "utf8");
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function fileWriteWithBackup(filePath: string, content: string) {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    try {
      copyFileSync(filePath, `${filePath}.bak`);
    } catch {
      /* ignore */
    }
    try {
      const snapDir = join(dirname(filePath), "backups");
      ensureDir(snapDir);
      const base = basename(filePath);
      copyFileSync(filePath, join(snapDir, `${base}.latest`));
    } catch {
      /* ignore */
    }
  }
  fileWriteAtomic(filePath, content);
}

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fileReadJson<T>(filePath: string): T | null {
  const candidates: string[] = [];
  if (existsSync(filePath)) candidates.push(filePath);
  if (existsSync(`${filePath}.bak`)) candidates.push(`${filePath}.bak`);
  const base = basename(filePath);
  const snapDir = join(dirname(filePath), "backups");
  if (existsSync(snapDir)) {
    const latest = join(snapDir, `${base}.latest`);
    if (existsSync(latest)) candidates.push(latest);
    try {
      const stamped = readdirSync(snapDir)
        .filter((f) => f.startsWith(`${base}.`) && f !== `${base}.latest`)
        .sort()
        .reverse();
      for (const f of stamped.slice(0, 3)) candidates.push(join(snapDir, f));
    } catch {
      /* ignore */
    }
  }
  for (const p of candidates) {
    try {
      const parsed = tryParseJson<T>(readFileSync(p, "utf8"));
      if (parsed != null) {
        if (p !== filePath) {
          try {
            fileWriteAtomic(filePath, JSON.stringify(parsed, null, 2));
            console.warn(`[persist] Restored ${base} from ${p}`);
          } catch {
            /* keep */
          }
        }
        return parsed;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Load all known stores from Postgres (or seed from local files once).
 * Safe to call multiple times.
 */
export async function initDurableStore(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isPostgresEnabled()) {
      console.info("[persist] DATABASE_URL not set — using local JSON files");
      initialized = true;
      return;
    }

    await ensureKvSchema();
    const keys = Object.values(STORE_KEYS);
    const dataDir = join(process.cwd(), "data");

    for (const key of keys) {
      let value = await kvGetJson<unknown>(key);
      if (value == null) {
        // One-time migrate from local files if present (e.g. after adding DATABASE_URL)
        const fileMap: Record<string, string> = {
          [STORE_KEYS.users]: join(dataDir, "users.json"),
          [STORE_KEYS.cms]: join(dataDir, "cms-db.json"),
          [STORE_KEYS.tickets]: join(dataDir, "tickets.json"),
          [STORE_KEYS.withdrawals]: join(dataDir, "withdrawals.json"),
          [STORE_KEYS.activity]: join(dataDir, "activity-log.json"),
        };
        const fp = fileMap[key];
        if (fp) {
          const fromFile = fileReadJson<unknown>(fp);
          if (fromFile != null) {
            console.info(`[persist] Migrating ${key} from file → Postgres`);
            await kvSetJson(key, fromFile);
            value = fromFile;
          }
        }
      }
      if (value != null) memory.set(key, value);
    }

    console.info(
      `[persist] Postgres durable store ready (${[...memory.keys()].join(", ") || "empty"})`
    );
    initialized = true;
  })().catch((err) => {
    initPromise = null;
    console.error("[persist] initDurableStore failed", err);
    throw err;
  });

  return initPromise;
}

export function isDurableReady(): boolean {
  return initialized || !isPostgresEnabled();
}

/** Sync read — uses memory when Postgres is configured */
export function readJsonFile<T>(filePath: string): T | null {
  const key = storeKeyFromPath(filePath);

  if (isPostgresEnabled()) {
    if (memory.has(key)) {
      return structuredClone(memory.get(key)) as T;
    }
    // Not initialized yet or empty — try file fallback once
    const fromFile = fileReadJson<T>(filePath);
    if (fromFile != null) {
      memory.set(key, fromFile);
      // schedule migrate
      void initDurableStore()
        .then(() => kvSetJson(key, fromFile))
        .catch(() => undefined);
      return structuredClone(fromFile) as T;
    }
    return null;
  }

  return fileReadJson<T>(filePath);
}

/** Sync write — memory + Postgres queue or file */
export function writeWithBackup(filePath: string, content: string) {
  const key = storeKeyFromPath(filePath);
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    data = content;
  }

  if (isPostgresEnabled()) {
    memory.set(key, data);
    writeChain = writeChain
      .then(async () => {
        if (!initialized) await initDurableStore();
        await kvSetJson(key, data);
      })
      .catch((err) => {
        console.error(`[persist] Postgres write failed for ${key}`, err);
      });
    // Also mirror to file when possible (local + non-ephemeral disks)
    try {
      fileWriteWithBackup(filePath, content);
    } catch {
      /* disk may be read-only */
    }
    return;
  }

  fileWriteWithBackup(filePath, content);
}

export function writeAtomic(filePath: string, content: string) {
  writeWithBackup(filePath, content);
}

export { ensureDir };

/** Async flush — wait until pending Postgres writes finish */
export async function flushDurableWrites(): Promise<void> {
  await writeChain;
}

/** Explicit async load (preferred in API routes) */
export async function loadStoreAsync<T>(
  key: string,
  filePath?: string
): Promise<T | null> {
  if (isPostgresEnabled()) {
    await initDurableStore();
    if (memory.has(key)) return structuredClone(memory.get(key)) as T;
    const v = await kvGetJson<T>(key);
    if (v != null) {
      memory.set(key, v);
      return structuredClone(v) as T;
    }
  }
  if (filePath) return fileReadJson<T>(filePath);
  return null;
}

export async function saveStoreAsync(key: string, value: unknown, filePath?: string) {
  if (isPostgresEnabled()) {
    await initDurableStore();
    memory.set(key, value);
    await kvSetJson(key, value);
  }
  if (filePath) {
    try {
      fileWriteWithBackup(filePath, JSON.stringify(value, null, 2));
    } catch {
      /* ignore */
    }
  }
}
