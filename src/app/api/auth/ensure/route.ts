import { NextResponse } from "next/server";
import { ensureUserRecord, isValidRole } from "@/lib/auth/local-users";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/ensure
 * Upsert the signed-in identity into data/users.json so Super Admin → Users
 * always shows real accounts (including Firebase / social logins).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const roleRaw = body.role ? String(body.role) : undefined;
    const role =
      roleRaw && isValidRole(roleRaw) ? (roleRaw as UserRole) : undefined;

    const user = ensureUserRecord({
      id: body.id ? String(body.id) : undefined,
      email,
      fullName: body.fullName ? String(body.fullName) : undefined,
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      photoURL: body.photoURL !== undefined ? String(body.photoURL) : undefined,
      role,
      membershipStatus: body.membershipStatus,
    });

    return NextResponse.json(
      { success: true, user },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ensure failed" },
      { status: 400 }
    );
  }
}
