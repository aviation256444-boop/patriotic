/**
 * Durable JSON document store in Postgres (JSONB).
 * One row per logical store key — survives Render redeploys when DATABASE_URL is set.
 */

import { isPostgresEnabled, query } from "./client";

export const STORE_KEYS = {
  users: "users",
  cms: "cms",
  tickets: "tickets",
  withdrawals: "withdrawals",
  activity: "activity",
  notifications: "notifications",
} as const;

export type StoreKey = (typeof STORE_KEYS)[keyof typeof STORE_KEYS] | string;

let schemaReady: Promise<void> | null = null;

export async function ensureKvSchema(): Promise<void> {
  if (!isPostgresEnabled()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS app_kv (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS app_kv_updated_at_idx
        ON app_kv (updated_at DESC);
      `);
      console.info("[db] app_kv schema ready");
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export async function kvGetJson<T>(key: StoreKey): Promise<T | null> {
  if (!isPostgresEnabled()) return null;
  await ensureKvSchema();
  const res = await query<{ value: T }>(
    `SELECT value FROM app_kv WHERE key = $1 LIMIT 1`,
    [key]
  );
  if (!res.rows[0]) return null;
  return res.rows[0].value as T;
}

export async function kvSetJson(key: StoreKey, value: unknown): Promise<void> {
  if (!isPostgresEnabled()) return;
  await ensureKvSchema();
  await query(
    `
    INSERT INTO app_kv (key, value, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
    `,
    [key, JSON.stringify(value)]
  );
}

export async function kvListKeys(): Promise<string[]> {
  if (!isPostgresEnabled()) return [];
  await ensureKvSchema();
  const res = await query<{ key: string }>(`SELECT key FROM app_kv ORDER BY key`);
  return res.rows.map((r) => r.key);
}

export async function kvHealth(): Promise<{
  ok: boolean;
  backend: "postgres" | "files";
  keys?: string[];
  error?: string;
}> {
  if (!isPostgresEnabled()) {
    return { ok: true, backend: "files" };
  }
  try {
    await ensureKvSchema();
    const keys = await kvListKeys();
    return { ok: true, backend: "postgres", keys };
  } catch (e) {
    return {
      ok: false,
      backend: "postgres",
      error: e instanceof Error ? e.message : "db error",
    };
  }
}
