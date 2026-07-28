import { NextResponse } from "next/server";
import { startEmailOtp } from "@/lib/auth/email-otp";

export const dynamic = "force-dynamic";

/** POST { email, fullName? } — send OTP; auto-register path if new email */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await startEmailOtp({
      email: String(body.email || ""),
      fullName: body.fullName ? String(body.fullName) : undefined,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start email sign-in" },
      { status: 400 }
    );
  }
}
