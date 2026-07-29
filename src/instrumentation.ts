/**
 * Runs once when the Next.js Node server starts.
 * Initializes Postgres durable store so data survives Render redeploys.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    const { initDurableStore } = await import("@/lib/persist/durable-json");
    const { isPostgresEnabled } = await import("@/lib/db/client");
    await initDurableStore();
    if (isPostgresEnabled()) {
      console.info("[instrumentation] Durable Postgres store initialized");
    } else {
      console.warn(
        "[instrumentation] DATABASE_URL missing — using local JSON files (data will not survive Render redeploys)"
      );
    }
  } catch (err) {
    console.error("[instrumentation] Failed to init durable store", err);
  }
}
