import { NextResponse } from "next/server";
import {
  exportUsersDb,
  importUsersDb,
  requireSuperAdminAny,
} from "@/lib/auth/local-users";
import { logActivity } from "@/lib/activity/log";

export const dynamic = "force-dynamic";

/**
 * POST — merge users from a browser snapshot (public user fields + optional
 * passwordHash if present). Used after free-host redeploys wipe the disk.
 *
 * Body: { actorId?, actorEmail?, users: [...] }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const actorId = String(body.actorId || "");
    const actorEmail = String(body.actorEmail || "");
    requireSuperAdminAny(actorId, actorEmail);

    const list = body.users;
    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json({ error: "No users in snapshot" }, { status: 400 });
    }

    // Build a users-db shaped object; only entries with passwordHash can fully restore login.
    // Public-only entries still re-create rows via ensure path by merging what we have.
    const withHashes = list.filter(
      (u) =>
        u &&
        typeof u === "object" &&
        typeof (u as { email?: string }).email === "string" &&
        typeof (u as { passwordHash?: string }).passwordHash === "string"
    );

    let added = 0;
    if (withHashes.length > 0) {
      added = importUsersDb({ users: withHashes }, true);
    }

    // Re-import public fields for accounts that only have profile data
    const { ensureUserRecord, isValidRole } = await import("@/lib/auth/local-users");
    let ensured = 0;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const u = raw as Record<string, unknown>;
      const email = String(u.email || "").toLowerCase();
      if (!email.includes("@")) continue;
      try {
        ensureUserRecord({
          id: u.id ? String(u.id) : undefined,
          email,
          fullName: u.fullName ? String(u.fullName) : undefined,
          phone: u.phone ? String(u.phone) : undefined,
          photoURL: u.photoURL ? String(u.photoURL) : undefined,
          role:
            u.role && isValidRole(String(u.role))
              ? (String(u.role) as never)
              : undefined,
          membershipStatus: u.membershipStatus as never,
        });
        ensured += 1;
      } catch {
        /* skip bad row */
      }
    }

    logActivity({
      kind: "system",
      action: `Restored users from browser snapshot (+${added} with passwords, ${ensured} profiles)`,
      actor: actorEmail || actorId,
    });

    const users = exportUsersDb();
    return NextResponse.json({
      success: true,
      added,
      ensured,
      count: users.users.length,
      users: users.users.map(({ passwordHash: _, ...pub }) => {
        void _;
        return pub;
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    const status = /super admin/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
