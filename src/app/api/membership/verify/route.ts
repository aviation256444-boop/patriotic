import { NextResponse } from "next/server";
import { getCollection } from "@/lib/cms/store";
import { findUserByEmail, listUsersWithMeta } from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

/**
 * GET /api/membership/verify?q=PYU-2024-... or email or PYU-MEMBER:CODE
 * Public-ish verify used by admin verify panel (and optional public kiosk).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let q = (searchParams.get("q") || searchParams.get("code") || "").trim();
    if (!q) {
      return NextResponse.json({ error: "Enter a membership number, email, or QR code" }, { status: 400 });
    }

    // QR format from digital card: PYU-MEMBER:NUMBER
    if (q.toUpperCase().startsWith("PYU-MEMBER:")) {
      q = q.slice("PYU-MEMBER:".length).trim();
    }

    const members = (await getCollection("members")) as Array<Record<string, unknown>>;
    const loginUsers = listUsersWithMeta();

    const qLower = q.toLowerCase();
    const member =
      members.find(
        (m) =>
          String(m.membershipNumber || "").toLowerCase() === qLower ||
          String(m.email || "").toLowerCase() === qLower ||
          String(m.id || "") === q
      ) || null;

    const login =
      loginUsers.find(
        (u) =>
          String(u.membershipNumber || "").toLowerCase() === qLower ||
          u.email.toLowerCase() === qLower ||
          u.id === q
      ) ||
      (member?.email ? findUserByEmail(String(member.email)) : null);

    if (!member && !login) {
      return NextResponse.json({
        success: true,
        found: false,
        valid: false,
        message: "No membership record found for that code or email",
      });
    }

    const status = String(
      (member?.membershipStatus as string) ||
        login?.membershipStatus ||
        "pending"
    ).toLowerCase();
    const valid = status === "active" || status === "approved";

    return NextResponse.json({
      success: true,
      found: true,
      valid,
      status,
      message: valid
        ? "Membership is valid and active"
        : `Membership found but status is "${status}" — not verified for full access`,
      member: {
        id: (member?.id as string) || login?.id,
        fullName:
          (member?.fullName as string) || login?.fullName || "Member",
        email: (member?.email as string) || login?.email,
        phone: (member?.phone as string) || login?.phone,
        membershipNumber:
          (member?.membershipNumber as string) || login?.membershipNumber,
        membershipStatus: status,
        district: (member?.district as string) || login?.district,
        role: (member?.role as string) || login?.role || "member",
        photoURL: (member?.photoURL as string) || login?.photoURL,
        createdAt: (member?.createdAt as string) || login?.createdAt,
        lastLoginAt: login?.lastLoginAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verify failed" },
      { status: 500 }
    );
  }
}
