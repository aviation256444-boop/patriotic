import { NextResponse } from "next/server";
import { getDb } from "@/lib/cms/store";
import {
  exportUsersDb,
  importUsersDb,
  requireSuperAdminAny,
} from "@/lib/auth/local-users";
import { exportActivity, importActivity } from "@/lib/activity/log";
import { listTickets } from "@/lib/tickets/store";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorFrom(request: Request, body?: Record<string, unknown>) {
  const { searchParams } = new URL(request.url);
  return (
    (body?.actorId as string) ||
    (body?.actorEmail as string) ||
    searchParams.get("actorId") ||
    searchParams.get("actorEmail") ||
    ""
  );
}

/**
 * GET full backup: CMS + users + tickets + activity
 */
export async function GET(request: Request) {
  try {
    const actor = actorFrom(request);
    if (!actor) {
      return NextResponse.json({ error: "Actor required" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    requireSuperAdminAny(
      actor,
      searchParams.get("actorEmail"),
      searchParams.get("actorId")
    );

    const cms = await getDb();
    const users = exportUsersDb();
    const activity = exportActivity();
    let tickets = { tickets: listTickets() };
    try {
      const p = join(process.cwd(), "data", "tickets.json");
      if (existsSync(p)) {
        tickets = JSON.parse(readFileSync(p, "utf8"));
      }
    } catch {
      /* use list */
    }

    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      cms,
      users,
      tickets,
      activity,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="pyu-full-backup-${Date.now()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    const status = /super admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST restore full backup (merge users/activity by default)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const actor = actorFrom(request, body);
    if (!actor) {
      return NextResponse.json({ error: "Actor required" }, { status: 401 });
    }
    requireSuperAdminAny(actor, body.actorEmail as string, body.actorId as string);

    const data = (body.data || body) as {
      cms?: unknown;
      users?: unknown;
      tickets?: unknown;
      activity?: unknown;
    };

    const results: Record<string, number | string> = {};

    if (data.users) {
      results.usersAdded = importUsersDb(data.users, body.merge !== false);
    }
    if (data.activity) {
      results.activityAdded = importActivity(data.activity);
    }
    if (data.tickets) {
      const dir = join(process.cwd(), "data");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "tickets.json"),
        JSON.stringify(data.tickets, null, 2),
        "utf8"
      );
      results.tickets = "restored";
    }
    if (data.cms) {
      const { importDatabase } = await import("@/lib/cms/store");
      await importDatabase(
        typeof data.cms === "string" ? data.cms : JSON.stringify(data.cms),
        actor
      );
      results.cms = "restored";
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 400 }
    );
  }
}
