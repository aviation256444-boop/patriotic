import { NextResponse } from "next/server";
import {
  createUserByAdmin,
  isValidRole,
  listUsersWithMeta,
  requireSuperAdmin,
} from "@/lib/auth/local-users";
import type { MembershipStatus, UserRole } from "@/types";

export const dynamic = "force-dynamic";

function actorFromRequest(request: Request, body?: Record<string, unknown>) {
  const { searchParams } = new URL(request.url);
  return (
    (body?.actorId as string) ||
    (body?.actorEmail as string) ||
    searchParams.get("actorId") ||
    searchParams.get("actorEmail") ||
    request.headers.get("x-actor-id") ||
    request.headers.get("x-actor-email") ||
    ""
  );
}

/**
 * GET /api/auth/users?actorId=...
 * Super admin only — list all login accounts from data/users.json
 */
export async function GET(request: Request) {
  try {
    const actorId = actorFromRequest(request);

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

/**
 * POST /api/auth/users
 * Super admin creates a new login account.
 * Body: { actorId, fullName, email, password, role?, phone?, membershipStatus? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const actorId = actorFromRequest(request, body);
    if (!actorId) {
      return NextResponse.json({ error: "Actor identity required" }, { status: 401 });
    }
    requireSuperAdmin(actorId);

    const role = body.role !== undefined ? String(body.role) : "member";
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = createUserByAdmin({
      fullName: String(body.fullName || body.name || ""),
      email: String(body.email || ""),
      password: String(body.password || body.newPassword || ""),
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      role: role as UserRole,
      membershipStatus:
        body.membershipStatus !== undefined
          ? (String(body.membershipStatus) as MembershipStatus)
          : "active",
      membershipNumber:
        body.membershipNumber !== undefined
          ? String(body.membershipNumber)
          : undefined,
      district: body.district !== undefined ? String(body.district) : undefined,
      occupation:
        body.occupation !== undefined ? String(body.occupation) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        user,
        message: "User account created. They can sign in with this email and password.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create user";
    const status = /super admin/i.test(message)
      ? 403
      : /already exists/i.test(message)
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
