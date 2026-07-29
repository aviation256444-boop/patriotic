/**
 * Postgres connection for durable app storage.
 * Set DATABASE_URL (Neon / Supabase / Render Postgres / etc.).
 * Without DATABASE_URL the app falls back to local JSON files (dev only).
 */

import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  ).trim();
}

export function isPostgresEnabled(): boolean {
  return getDatabaseUrl().length > 10;
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    // Internal Render Postgres (hostname like dpg-xxx with no public domain) often works without SSL.
    // External / Neon need SSL.
    const isLocal =
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1");
    const isRenderInternal =
      /@dpg-[a-z0-9-]+(?:\/|:)/i.test(connectionString) &&
      !connectionString.includes("render.com");
    const forceSsl = process.env.DATABASE_SSL === "true";
    const disableSsl =
      process.env.DATABASE_SSL === "false" || isLocal || isRenderInternal;

    pool = new Pool({
      connectionString,
      ssl: forceSsl
        ? { rejectUnauthorized: false }
        : disableSsl
          ? undefined
          : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 20_000,
    });
    pool.on("error", (err) => {
      console.error("[db] unexpected pool error", err);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params);
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
