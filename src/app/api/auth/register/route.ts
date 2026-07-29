import { NextResponse } from "next/server";
import { registerLocalUser } from "@/lib/auth/local-users";
import { syncUserToCmsMembers } from "@/lib/auth/sync-member";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.fullName || body.name || "").trim();

    const user = registerLocalUser({ email, password, fullName });
    // So Admin → Members and CMS Members lists show this account
    await syncUserToCmsMembers(user, "registration");

    try {
      const { createNotification } = await import("@/lib/notifications/store");
      createNotification({
        sourceKey: `welcome:${user.id}`,
        audience: "user",
        userId: user.id,
        userEmail: user.email,
        type: "system",
        title: `Welcome to PYU, ${user.fullName.split(" ")[0]}!`,
        message:
          "Your account was created successfully. Explore membership, events, and programs from your dashboard.",
        link: "/dashboard",
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      success: true,
      user,
      message: "Account created. You can sign in anytime with this email and password.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = /already exists/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
