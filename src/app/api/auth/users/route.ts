import { NextResponse } from "next/server";
import {
  listUsersWithMeta,
  requireSuperAdmin,
} from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/users?actorId=...
 * Super admin only — list all login accounts from data/users.json
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId =
      searchParams.get("actorId") ||
      searchParams.get("actorEmail") ||
      request.headers.get("x-actor-id") ||
      request.headers.get("x-actor-email") ||
      "";

    if (!actorId) {
      return NextResponse.json(
        { error: "Actor identity required (actorId)" },
        { status: 401 }
      );
    }

    requireSuperAdmin(actorId);
    const users = listUsersWithMeta();
    return NextResponse.json(
      { success: true, users, count: users.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list users";
    const status = /super admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
