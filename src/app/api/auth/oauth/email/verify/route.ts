import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/auth/email-otp";

export const dynamic = "force-dynamic";

/** POST { email, code } — verify OTP, login or auto-create account */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await verifyEmailOtp({
      email: String(body.email || ""),
      code: String(body.code || ""),
    });
    return NextResponse.json(
      {
        success: true,
        user,
        message: "Signed in with email",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid code" },
      { status: 401 }
    );
  }
}
