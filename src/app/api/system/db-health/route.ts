import { NextResponse } from "next/server";
import { kvHealth } from "@/lib/db/kv-store";
import { isPostgresEnabled, getDatabaseUrl } from "@/lib/db/client";
import { initDurableStore } from "@/lib/persist/durable-json";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/db-health
 * Shows whether durable Postgres is connected (no secrets).
 */
export async function GET() {
  try {
    await initDurableStore();
    const health = await kvHealth();
    const url = getDatabaseUrl();
    let hostHint = "not-set";
    if (url) {
      try {
        hostHint = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname;
      } catch {
        hostHint = "configured";
      }
    }
    return NextResponse.json(
      {
        ok: health.ok,
        backend: health.backend,
        postgresEnabled: isPostgresEnabled(),
        host: hostHint,
        keys: health.keys || [],
        error: health.error,
        message:
          health.backend === "postgres"
            ? "Data is stored in Postgres and survives Render redeploys."
            : "DATABASE_URL is not set — using local JSON files (wiped on free Render redeploy).",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "health check failed",
      },
      { status: 500 }
    );
  }
}
