import { NextResponse } from "next/server";
import { getCollection } from "@/lib/cms/store";
import { findUserByEmail, listUsersWithMeta } from "@/lib/auth/local-users";
import type { CmsMember } from "@/lib/cms/types";

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
      return NextResponse.json(
        { error: "Enter a membership number, email, or QR code" },
        { status: 400 }
      );
    }

    // QR format from digital card: PYU-MEMBER:NUMBER
    if (q.toUpperCase().startsWith("PYU-MEMBER:")) {
      q = q.slice("PYU-MEMBER:".length).trim();
    }

    const members = (await getCollection("members")) as CmsMember[];
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
      member?.membershipStatus || login?.membershipStatus || "pending"
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
        id: member?.id || login?.id,
        fullName: member?.fullName || login?.fullName || "Member",
        email: member?.email || login?.email,
        phone: member?.phone || login?.phone,
        membershipNumber: member?.membershipNumber || login?.membershipNumber,
        membershipStatus: status,
        district: member?.district || login?.district,
        role: member?.role || login?.role || "member",
        photoURL: member?.photoURL || login?.photoURL,
        createdAt: member?.createdAt || login?.createdAt,
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
