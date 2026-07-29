import { NextResponse } from "next/server";
import {
  findUserFlexible,
  updateOwnCredentials,
  applyRolePrivilegesIfSuper,
  publicUserFromStored,
} from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me?userId=... or ?email=...
 * Refresh current user from durable store (role after promotion is here).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const email = searchParams.get("email") || "";

    // Prefer email first so Firebase uid mismatches still resolve promotions
    let stored = findUserFlexible(email, userId);

    if (!stored) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keep super admin privilege pack complete
    stored = applyRolePrivilegesIfSuper(stored);

    const user = publicUserFromStored(stored);
    return NextResponse.json(
      {
        success: true,
        user,
        isSuperAdmin: user.role === "super_admin",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/me
 * User updates own credentials (name, email, phone, password).
 * Body: { userId, fullName?, email?, phone?, currentPassword?, newPassword? }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const userId = String(body.userId || "");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const user = updateOwnCredentials(userId, {
      fullName: body.fullName !== undefined ? String(body.fullName) : undefined,
      email: body.email !== undefined ? String(body.email) : undefined,
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      currentPassword:
        body.currentPassword !== undefined
          ? String(body.currentPassword)
          : undefined,
      newPassword:
        body.newPassword !== undefined ? String(body.newPassword) : undefined,
    });

    return NextResponse.json({
      success: true,
      user,
      message: "Your account was updated",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
