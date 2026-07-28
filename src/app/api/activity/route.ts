import { NextResponse } from "next/server";
import { listActivity } from "@/lib/activity/log";
import { requireSuperAdminAny } from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity?actorId=...&limit=50
 * Super admin — past logins, account changes, CMS activity.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId =
      searchParams.get("actorId") || request.headers.get("x-actor-id") || "";
    const actorEmail =
      searchParams.get("actorEmail") ||
      request.headers.get("x-actor-email") ||
      "";
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Actor required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);
    const limit = Number(searchParams.get("limit") || 80);
    const entries = listActivity(limit);
    return NextResponse.json(
      { success: true, entries, count: entries.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = /super admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
