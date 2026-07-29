import { NextResponse } from "next/server";
import {
  findUserByEmail,
  findUserById,
  updateOwnProfile,
} from "@/lib/auth/local-users";
import { syncUserToCmsMembers } from "@/lib/auth/sync-member";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/auth/profile
 * Authenticated member updates their own profile (including photoURL).
 * Body: { actorId, actorEmail, fullName?, phone?, photoURL?, district?, subCounty?, occupation?, education? }
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const actorId = String(body.actorId || body.userId || "").trim();
    const actorEmail = String(body.actorEmail || body.email || "")
      .trim()
      .toLowerCase();

    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const existing =
      (actorId ? findUserById(actorId) : null) ||
      (actorEmail ? findUserByEmail(actorEmail) : null);

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Must be self
    if (actorId && existing.id !== actorId) {
      if (!actorEmail || existing.email.toLowerCase() !== actorEmail) {
        return NextResponse.json(
          { error: "You can only edit your own profile" },
          { status: 403 }
        );
      }
    }
    if (
      actorEmail &&
      existing.email.toLowerCase() !== actorEmail &&
      existing.id !== actorId
    ) {
      return NextResponse.json(
        { error: "You can only edit your own profile" },
        { status: 403 }
      );
    }

    const user = updateOwnProfile(existing.id, existing.email, {
      fullName: body.fullName !== undefined ? String(body.fullName) : undefined,
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      photoURL: body.photoURL !== undefined ? String(body.photoURL) : undefined,
      district: body.district !== undefined ? String(body.district) : undefined,
      subCounty:
        body.subCounty !== undefined ? String(body.subCounty) : undefined,
      occupation:
        body.occupation !== undefined ? String(body.occupation) : undefined,
      education:
        body.education !== undefined ? String(body.education) : undefined,
    });

    try {
      await syncUserToCmsMembers(user, user.email);
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      user,
      message: "Profile saved",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    const status = /not found/i.test(message)
      ? 404
      : /only edit/i.test(message)
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
