import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGoogleClientId } from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/oauth/google/start?next=/dashboard
 * Redirects to Google account picker (all Gmail accounts on the device).
 */
export async function GET(request: Request) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin ||
      "http://localhost:3000";
    return NextResponse.redirect(
      new URL(
        `/auth/login?google_error=${encodeURIComponent(
          "Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in Render Environment, then Manual Deploy (Clear build cache)."
        )}`,
        appUrl
      )
    );
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/dashboard";
  const mode = searchParams.get("mode") || "login";

  // Prefer public app URL; fall back to request origin (local dev)
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;

  const redirectUri = `${origin}/auth/callback/google`;
  const nonce = randomBytes(16).toString("hex");
  const state = Buffer.from(
    JSON.stringify({ next, mode, nonce, t: Date.now() })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state,
    // Force the full account chooser (all Google accounts on the device)
    prompt: "select_account",
    // Access type not needed for id_token
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
