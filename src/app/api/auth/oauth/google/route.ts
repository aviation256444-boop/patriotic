import { NextResponse } from "next/server";
import {
  isGoogleOAuthConfigured,
  loginWithGoogleIdToken,
} from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

/** POST { credential } — Google GIS ID token; login or auto-register */
export async function POST(request: Request) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google sign-in is not set up. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID, or use Continue with Email.",
        },
        { status: 503 }
      );
    }
    const body = await request.json();
    const credential = String(body.credential || body.idToken || "");
    const user = await loginWithGoogleIdToken(credential);
    return NextResponse.json(
      { success: true, user },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google sign-in failed" },
      { status: 401 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    enabled: isGoogleOAuthConfigured(),
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? "configured"
      : null,
  });
}
