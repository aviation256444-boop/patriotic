import { NextResponse } from "next/server";
import { registerLocalUser } from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.fullName || body.name || "").trim();

    const user = registerLocalUser({ email, password, fullName });

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
