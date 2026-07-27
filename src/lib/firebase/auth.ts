"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isDemoMode } from "./config";
import type { User, UserRole } from "@/types";

function mapFirebaseUser(user: FirebaseUser, role: UserRole = "member"): User {
  return {
    id: user.uid,
    email: user.email || "",
    fullName: user.displayName || "Member",
    phone: user.phoneNumber || undefined,
    photoURL: user.photoURL || undefined,
    role,
    membershipStatus: "pending",
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapFirebaseError(err: unknown): Error {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed": "Email/password sign-up is disabled in Firebase Console.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
  };
  if (code && messages[code]) return new Error(messages[code]);
  if (err instanceof Error) return err;
  return new Error("Authentication failed");
}

/** Local (file) auth API — used when Firebase / demo mode */
async function localRegister(email: string, password: string, fullName: string): Promise<User> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Registration failed");
  if (typeof window !== "undefined") {
    localStorage.setItem("pyu_user", JSON.stringify(data.user));
  }
  return data.user as User;
}

async function localLogin(email: string, password: string): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Invalid email or password");
  if (typeof window !== "undefined") {
    localStorage.setItem("pyu_user", JSON.stringify(data.user));
  }
  return data.user as User;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (isDemoMode) {
    return localLogin(email, password);
  }

  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Fallback if Firebase misconfigured
      return localLogin(email, password);
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(cred.user);
  } catch (e) {
    // If Firebase fails hard, try local store so site still works on Render
    try {
      return await localLogin(email, password);
    } catch {
      throw mapFirebaseError(e);
    }
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<User> {
  if (isDemoMode) {
    return localRegister(email, password, fullName);
  }

  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      return localRegister(email, password, fullName);
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    return mapFirebaseUser(cred.user);
  } catch (e) {
    // Fallback to local registry if Firebase email/password not enabled
    const msg = e instanceof Error ? e.message : "";
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (
      code === "auth/operation-not-allowed" ||
      code === "auth/configuration-not-found" ||
      /not initialized|API key/i.test(msg)
    ) {
      return localRegister(email, password, fullName);
    }
    throw mapFirebaseError(e);
  }
}

export async function signInWithGoogle(): Promise<User> {
  if (isDemoMode) {
    throw new Error(
      "Google sign-in needs Firebase. Use email registration, or set Firebase keys and disable DEMO_MODE."
    );
  }
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Auth not initialized");
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return mapFirebaseUser(cred.user);
  } catch (e) {
    throw mapFirebaseError(e);
  }
}

export async function signInWithFacebook(): Promise<User> {
  if (isDemoMode) {
    throw new Error(
      "Facebook sign-in needs Firebase. Use email registration, or configure Firebase."
    );
  }
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Auth not initialized");
    const provider = new FacebookAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return mapFirebaseUser(cred.user);
  } catch (e) {
    throw mapFirebaseError(e);
  }
}

export async function signInWithApple(): Promise<User> {
  if (isDemoMode) {
    throw new Error("Apple sign-in needs Firebase. Use email registration for now.");
  }
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Auth not initialized");
    const provider = new OAuthProvider("apple.com");
    const cred = await signInWithPopup(auth, provider);
    return mapFirebaseUser(cred.user);
  } catch (e) {
    throw mapFirebaseError(e);
  }
}

export async function resetPassword(email: string): Promise<void> {
  if (isDemoMode) {
    throw new Error(
      "Password reset needs Firebase email provider. Contact an admin or re-register if this is a demo account."
    );
  }
  try {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Auth not initialized");
    await sendPasswordResetEmail(auth, email);
  } catch (e) {
    throw mapFirebaseError(e);
  }
}

export async function signOut(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pyu_user");
  }
  if (isDemoMode) return;
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function getDemoUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("pyu_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
