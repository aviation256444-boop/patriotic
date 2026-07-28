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

export async function loginWithGoogleIdToken(idToken: string): Promise<User> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID."
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
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}
