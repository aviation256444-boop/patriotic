import { NextResponse } from "next/server";
import {
  findUserById,
  requireSuperAdmin,
  setUserPassword,
  updateUserByAdmin,
  isValidRole,
} from "@/lib/auth/local-users";
import type { MembershipStatus, UserRole } from "@/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function actorFrom(request: Request, body?: Record<string, unknown>) {
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
 * GET /api/auth/users/:id — single user (super admin)
 */
export async function GET(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actorId = actorFrom(request);
    requireSuperAdmin(actorId);
    const user = findUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { passwordHash: _, ...pub } = user;
    void _;
    return NextResponse.json({ success: true, user: pub });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = /super admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/auth/users/:id
 * Super admin updates credentials / role / membership.
 * Body may include password to reset.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const actorId = actorFrom(request, body);
    if (!actorId) {
      return NextResponse.json({ error: "Actor identity required" }, { status: 401 });
    }
    requireSuperAdmin(actorId);

    if (body.role !== undefined && !isValidRole(String(body.role))) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let user = updateUserByAdmin(id, {
      fullName: body.fullName !== undefined ? String(body.fullName) : undefined,
      email: body.email !== undefined ? String(body.email) : undefined,
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      role: body.role !== undefined ? (String(body.role) as UserRole) : undefined,
      membershipStatus:
        body.membershipStatus !== undefined
          ? (String(body.membershipStatus) as MembershipStatus)
          : undefined,
      membershipNumber:
        body.membershipNumber !== undefined
          ? String(body.membershipNumber)
          : undefined,
      district: body.district !== undefined ? String(body.district) : undefined,
      occupation:
        body.occupation !== undefined ? String(body.occupation) : undefined,
    });

    if (body.password || body.newPassword) {
      const pw = String(body.password || body.newPassword || "");
      user = setUserPassword(id, pw);
    }

    return NextResponse.json({
      success: true,
      user,
      message: "User credentials updated",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    const status = /super admin/i.test(message)
      ? 403
      : /not found/i.test(message)
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
