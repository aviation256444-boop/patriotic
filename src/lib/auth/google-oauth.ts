/**
 * Verify Google ID token (GIS One Tap / OAuth) without Firebase.
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID (and same on Google Cloud Console).
 */

import { ensureUserRecord } from "@/lib/auth/local-users";
import { logActivity } from "@/lib/activity/log";
import type { User } from "@/types";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
  error?: string;
  error_description?: string;
};

/**
 * Google OAuth Web Client ID (public).
 * IMPORTANT: reference process.env.NEXT_PUBLIC_* as a direct property so
 * Next.js inlines it at build time from .env.production / Render env.
 */
const BAKED_GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  // Public Web Client ID fallback (safe — not a secret). Ensures Render
  // still works if dashboard env was never set.
  "868445110488-pj1f968b1a5f444bva2hkl9gc4v550uu.apps.googleusercontent.com";

export function getGoogleClientId(): string {
  const raw =
    BAKED_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    "";
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

export async function loginWithGoogleIdToken(idToken: string): Promise<User> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured. In Render → Environment add NEXT_PUBLIC_GOOGLE_CLIENT_ID, then Manual Deploy (Clear build cache)."
    );
  }
  if (!idToken || idToken.length < 20) {
    throw new Error("Missing Google credential");
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  const data = (await res.json()) as GoogleTokenInfo;
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Invalid Google token");
  }

  if (data.aud !== clientId) {
    throw new Error("Google token was not issued for this app");
  }

  const email = String(data.email || "")
    .toLowerCase()
    .trim();
  if (!email) {
    throw new Error("Google account has no email");
  }

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified) {
    throw new Error("Google email is not verified");
  }

  const user = ensureUserRecord({
    id: data.sub ? `google-${data.sub}` : undefined,
    email,
    fullName: data.name || email.split("@")[0],
    photoURL: data.picture,
    role: "member",
    membershipStatus: "active",
  });

  logActivity({
    kind: "login",
    action: `Signed in with Google: ${email}`,
    actor: email,
    target: user.id,
    meta: { provider: "google" },
  });

  return user;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(getGoogleClientId());
}
