/**
 * Passwordless email OTP — login or auto-register with email only.
 */

import { createHash, randomInt, randomUUID } from "crypto";
import { join } from "path";
import { ensureDir, readJsonFile, writeWithBackup } from "@/lib/persist/atomic-file";
import {
  ensureUserRecord,
  findUserByEmail,
  setUserPassword,
} from "@/lib/auth/local-users";
import { logActivity } from "@/lib/activity/log";
import type { User } from "@/types";

type OtpRow = {
  email: string;
  codeHash: string;
  fullName?: string;
  purpose: "login" | "register";
  expiresAt: number;
  attempts: number;
};

type OtpDb = { rows: OtpRow[] };

const FILE = join(process.cwd(), "data", "email-otp.json");
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function load(): OtpDb {
  ensureDir(join(process.cwd(), "data"));
  const parsed = readJsonFile<OtpDb>(FILE);
  if (parsed && Array.isArray(parsed.rows)) {
    const now = Date.now();
    return { rows: parsed.rows.filter((r) => r.expiresAt > now) };
  }
  return { rows: [] };
}

function save(db: OtpDb) {
  writeWithBackup(FILE, JSON.stringify(db, null, 2));
}

function hashCode(email: string, code: string): string {
  const secret = process.env.AUTH_SECRET || "pyu-otp-secret";
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "PYU <onboarding@resend.dev>";
  if (!key) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your PYU sign-in code",
        html: `<p>Your Patriotic Youths of Uganda sign-in code is:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
          <p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>`,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Resend email failed", e);
    return false;
  }
}

export type StartOtpResult = {
  success: true;
  email: string;
  message: string;
  /** Only when email provider missing / AUTH_SHOW_OTP=true — never rely on this in strict production */
  devCode?: string;
  isNewUser: boolean;
};

export async function startEmailOtp(input: {
  email: string;
  fullName?: string;
}): Promise<StartOtpResult> {
  const email = String(input.email || "")
    .toLowerCase()
    .trim();
  if (!email || !email.includes("@") || email.length < 5) {
    throw new Error("Enter a valid email address");
  }

  const existing = findUserByEmail(email);
  const isNewUser = !existing;
  const fullName =
    input.fullName?.trim() ||
    existing?.fullName ||
    email.split("@")[0].replace(/[._]/g, " ") ||
    "Member";

  const code = generateCode();
  const db = load();
  db.rows = db.rows.filter((r) => r.email !== email);
  db.rows.push({
    email,
    codeHash: hashCode(email, code),
    fullName,
    purpose: isNewUser ? "register" : "login",
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  });
  save(db);

  const emailed = await sendOtpEmail(email, code);
  const showCode =
    !emailed ||
    process.env.AUTH_SHOW_OTP === "true" ||
    process.env.NODE_ENV === "development";

  logActivity({
    kind: "login",
    action: `OTP requested for ${email} (${isNewUser ? "new" : "existing"})`,
    actor: email,
    meta: { emailed, isNewUser },
  });

  return {
    success: true,
    email,
    isNewUser,
    message: emailed
      ? "We sent a 6-digit code to your email. Enter it to continue."
      : showCode
        ? "Enter the code below to continue (email delivery not configured)."
        : "If this email can receive mail, a code was sent. Enter it to continue.",
    devCode: showCode ? code : undefined,
  };
}

export async function verifyEmailOtp(input: {
  email: string;
  code: string;
}): Promise<User> {
  const email = String(input.email || "")
    .toLowerCase()
    .trim();
  const code = String(input.code || "").replace(/\s/g, "");
  if (!email || !/^\d{6}$/.test(code)) {
    throw new Error("Enter the 6-digit code from your email");
  }

  const db = load();
  const idx = db.rows.findIndex((r) => r.email === email);
  if (idx < 0) {
    throw new Error("No active code for this email. Request a new one.");
  }
  const row = db.rows[idx];
  if (row.expiresAt < Date.now()) {
    db.rows.splice(idx, 1);
    save(db);
    throw new Error("Code expired. Request a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    db.rows.splice(idx, 1);
    save(db);
    throw new Error("Too many attempts. Request a new code.");
  }

  if (row.codeHash !== hashCode(email, code)) {
    row.attempts += 1;
    db.rows[idx] = row;
    save(db);
    throw new Error("Incorrect code. Try again.");
  }

  // Consume OTP
  db.rows.splice(idx, 1);
  save(db);

  // Auto-register if new, then sign in
  const existing = findUserByEmail(email);
  if (!existing) {
    const tempPassword = randomUUID() + randomUUID();
    // create via ensure then set known password for session continuity not needed
    const user = ensureUserRecord({
      email,
      fullName: row.fullName || email.split("@")[0],
      role: "member",
      membershipStatus: "active",
    });
    // Give them a random unguessable password (they use email OTP next time)
    setUserPassword(user.id, tempPassword);
    logActivity({
      kind: "register",
      action: `Auto-registered via email OTP: ${email}`,
      actor: email,
      target: user.id,
    });
    // Return ensure result with login stamp
    const signed = ensureUserRecord({
      id: user.id,
      email,
      fullName: user.fullName,
      role: user.role,
      membershipStatus: user.membershipStatus,
    });
    logActivity({
      kind: "login",
      action: `Signed in via email OTP: ${email}`,
      actor: email,
      target: signed.id,
    });
    return signed;
  }

  // Existing user — record login without password
  const user = ensureUserRecord({
    id: existing.id,
    email: existing.email,
    fullName: existing.fullName,
    role: existing.role,
    membershipStatus: existing.membershipStatus,
  });
  logActivity({
    kind: "login",
    action: `Signed in via email OTP: ${email}`,
    actor: email,
    target: user.id,
  });
  return user;
}


