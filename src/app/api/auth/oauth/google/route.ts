import { NextResponse } from "next/server";
import {
  getGoogleClientId,
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
            "Google sign-in is not set up. In Render → Environment add NEXT_PUBLIC_GOOGLE_CLIENT_ID = your Client ID, then Manual Deploy → Clear build cache & deploy.",
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
  const id = getGoogleClientId();
  return NextResponse.json({
    enabled: isGoogleOAuthConfigured(),
    clientId: id ? "configured" : null,
    hint: id ? `${id.slice(0, 12)}…` : "missing",
  });
}
