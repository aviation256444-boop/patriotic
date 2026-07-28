import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy route: used to redirect with OAuth implicit response_type=id_token.
 * Google blocks that flow (Error 400: invalid_request / policy).
 * Sign-in now uses Google Identity Services on the login/register pages.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/dashboard";
  const mode = searchParams.get("mode") || "login";

  const path = mode === "register" ? "/auth/register" : "/auth/login";
  const qs = new URLSearchParams({
    google_error:
      "Please use the Google button on this page (updated secure sign-in).",
  });
  if (next.startsWith("/")) qs.set("next", next);

  return NextResponse.redirect(new URL(`${path}?${qs.toString()}`, origin));
}
