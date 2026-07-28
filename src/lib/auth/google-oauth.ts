/**
 * Verify Google ID token (OAuth) without Firebase.
 * Client ID is public — baked in so Render always enables the Google button.
 */

import { ensureUserRecord, nextMembershipNumber } from "@/lib/auth/local-users";
import { syncUserToCmsMembers } from "@/lib/auth/sync-member";
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

/** Public OAuth Web Client ID (not a secret). */
export const GOOGLE_OAUTH_CLIENT_ID =
  "868445110488-pj1f968b1a5f444bva2hkl9gc4v550uu.apps.googleusercontent.com";

export function getGoogleClientId(): string {
  // Prefer env when set, otherwise always use the known public client ID
  const fromEnv = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const id = fromEnv || GOOGLE_OAUTH_CLIENT_ID;
  return id.replace(/^["']|["']$/g, "");
}

export function isGoogleOAuthConfigured(): boolean {
  return getGoogleClientId().length > 20;
}

export async function loginWithGoogleIdToken(idToken: string): Promise<User> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Google sign-in is not configured.");
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

  let user = ensureUserRecord({
    id: data.sub ? `google-${data.sub}` : undefined,
    email,
    fullName: data.name || email.split("@")[0],
    photoURL: data.picture,
    role: "member",
    membershipStatus: "active",
  });

  // Ensure membership number exists for Google accounts
  if (!user.membershipNumber) {
    const { updateUserByAdmin } = await import("@/lib/auth/local-users");
    try {
      user = updateUserByAdmin(user.id, {
        membershipNumber: nextMembershipNumber(),
      });
    } catch {
      /* keep user as-is */
    }
  }

  await syncUserToCmsMembers(user, "google-oauth");

  logActivity({
    kind: "login",
    action: `Signed in with Google: ${email}`,
    actor: email,
    target: user.id,
    meta: { provider: "google" },
  });

  return user;
}
