/**
 * File-backed user registry for registration / login when Firebase is not configured
 * (NEXT_PUBLIC_DEMO_MODE or missing Firebase keys).
 * Stored at data/users.json — works on a single Render instance (+ optional disk).
 */

import { createHash, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type { User, UserRole } from "@/types";

export type StoredUser = User & {
  passwordHash: string;
  /** ISO timestamp of last successful login */
  lastLoginAt?: string;
};

type UsersDb = { users: StoredUser[] };

const DATA_DIR = join(process.cwd(), "data");
const USERS_FILE = join(DATA_DIR, "users.json");

function hashPassword(password: string, salt?: string): string {
  const s = salt || randomUUID().replace(/-/g, "").slice(0, 16);
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function ensureDb(): UsersDb {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(USERS_FILE)) {
    const seed = seedDemoUsers();
    writeAtomic(USERS_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    const raw = readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw) as UsersDb;
    if (!parsed.users || !Array.isArray(parsed.users)) return seedDemoUsers();
    // Ensure demo accounts always exist for admins
    return ensureDemoAccounts(parsed);
  } catch {
    const seed = seedDemoUsers();
    writeAtomic(USERS_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
}

function writeAtomic(path: string, content: string) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, path);
  } catch {
    writeFileSync(path, content, "utf8");
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("fs").unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function saveDb(db: UsersDb) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeAtomic(USERS_FILE, JSON.stringify(db, null, 2));
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _pw, ...rest } = u;
  void _pw;
  return {
    ...rest,
    lastLoginAt: u.lastLoginAt,
  };
}

function seedDemoUsers(): UsersDb {
  const now = new Date().toISOString();
  const demos: Array<{
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    id: string;
  }> = [
    {
      id: "demo-member-1",
      email: "member@pyu.ug",
      password: "demo1234",
      fullName: "Amina Nakato",
      role: "member",
    },
    {
      id: "demo-admin-1",
      email: "admin@pyu.ug",
      password: "admin1234",
      fullName: "David Okello",
      role: "admin",
    },
    {
      id: "demo-super-1",
      email: "superadmin@pyu.ug",
      password: "super1234",
      fullName: "Sarah Namukasa",
      role: "super_admin",
    },
  ];

  return {
    users: demos.map((d) => ({
      id: d.id,
      email: d.email.toLowerCase(),
      fullName: d.fullName,
      role: d.role,
      membershipStatus: "active" as const,
      membershipNumber:
        d.role === "super_admin"
          ? "PYU-2022-000001"
          : d.role === "admin"
            ? "PYU-2023-000001"
            : "PYU-2024-100001",
      passwordHash: hashPassword(d.password),
      volunteerHours: d.role === "super_admin" ? 500 : d.role === "admin" ? 200 : 48,
      badges: d.role === "member" ? ["first-event"] : ["leader", "patriot"],
      createdAt: now,
      updatedAt: now,
      twoFactorEnabled: d.role !== "member",
    })),
  };
}

function ensureDemoAccounts(db: UsersDb): UsersDb {
  const seed = seedDemoUsers();
  let changed = false;
  for (const demo of seed.users) {
    const exists = db.users.some((u) => u.email === demo.email);
    if (!exists) {
      db.users.push(demo);
      changed = true;
    }
  }
  if (changed) saveDb(db);
  return db;
}

export function listUsersPublic(): User[] {
  return ensureDb().users.map(publicUser);
}

/** Public user list with lastLoginAt (still no password hashes). */
export function listUsersWithMeta(): Array<User & { lastLoginAt?: string }> {
  return ensureDb().users.map((u) => {
    const pub = publicUser(u);
    return { ...pub, lastLoginAt: u.lastLoginAt };
  });
}

export function findUserByEmail(email: string): StoredUser | null {
  const db = ensureDb();
  return db.users.find((u) => u.email === email.toLowerCase().trim()) || null;
}

export function findUserById(id: string): StoredUser | null {
  const db = ensureDb();
  return db.users.find((u) => u.id === id) || null;
}

export function countSuperAdmins(): number {
  return ensureDb().users.filter((u) => u.role === "super_admin").length;
}

const ALLOWED_ROLES: UserRole[] = [
  "member",
  "volunteer",
  "district_admin",
  "regional_admin",
  "admin",
  "super_admin",
];

export function isValidRole(role: string): role is UserRole {
  return ALLOWED_ROLES.includes(role as UserRole);
}

/**
 * Super admin: update another user's profile credentials and/or role.
 * Passwords set via setUserPassword.
 */
export function updateUserByAdmin(
  userId: string,
  patch: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    membershipStatus?: User["membershipStatus"];
    membershipNumber?: string;
    district?: string;
    occupation?: string;
  }
): User {
  const db = ensureDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("User not found");

  const current = db.users[idx];

  if (patch.email) {
    const email = patch.email.toLowerCase().trim();
    if (!email.includes("@")) throw new Error("Enter a valid email address");
    const clash = db.users.some((u) => u.id !== userId && u.email === email);
    if (clash) throw new Error("Another account already uses this email");
    current.email = email;
  }

  if (patch.fullName !== undefined) {
    const fullName = patch.fullName.trim();
    if (fullName.length < 2) throw new Error("Full name is too short");
    current.fullName = fullName;
  }

  if (patch.phone !== undefined) {
    current.phone = patch.phone.trim() || undefined;
  }

  if (patch.role !== undefined) {
    if (!isValidRole(patch.role)) throw new Error("Invalid role");
    if (current.role === "super_admin" && patch.role !== "super_admin") {
      if (countSuperAdmins() <= 1) {
        throw new Error("Cannot demote the last super admin");
      }
    }
    current.role = patch.role;
  }

  if (patch.membershipStatus !== undefined) {
    current.membershipStatus = patch.membershipStatus;
  }
  if (patch.membershipNumber !== undefined) {
    current.membershipNumber = patch.membershipNumber.trim() || undefined;
  }
  if (patch.district !== undefined) {
    current.district = patch.district.trim() || undefined;
  }
  if (patch.occupation !== undefined) {
    current.occupation = patch.occupation.trim() || undefined;
  }

  current.updatedAt = new Date().toISOString();
  db.users[idx] = current;
  saveDb(db);
  return publicUser(current);
}

/** Super admin or self: set a new password for a user. */
export function setUserPassword(userId: string, newPassword: string): User {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const db = ensureDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("User not found");

  db.users[idx].passwordHash = hashPassword(newPassword);
  db.users[idx].updatedAt = new Date().toISOString();
  saveDb(db);
  return publicUser(db.users[idx]);
}

/**
 * Logged-in user updates own profile. Optionally change password with currentPassword.
 */
export function updateOwnCredentials(
  userId: string,
  patch: {
    fullName?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  }
): User {
  const db = ensureDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("User not found");
  const current = db.users[idx];

  if (patch.newPassword) {
    if (!patch.currentPassword) {
      throw new Error("Enter your current password to set a new one");
    }
    if (!verifyPassword(patch.currentPassword, current.passwordHash)) {
      throw new Error("Current password is incorrect");
    }
    if (patch.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }
    current.passwordHash = hashPassword(patch.newPassword);
  }

  if (patch.email) {
    const email = patch.email.toLowerCase().trim();
    if (!email.includes("@")) throw new Error("Enter a valid email address");
    const clash = db.users.some((u) => u.id !== userId && u.email === email);
    if (clash) throw new Error("Another account already uses this email");
    current.email = email;
  }

  if (patch.fullName !== undefined) {
    const fullName = patch.fullName.trim();
    if (fullName.length < 2) throw new Error("Full name is too short");
    current.fullName = fullName;
  }

  if (patch.phone !== undefined) {
    current.phone = patch.phone.trim() || undefined;
  }

  current.updatedAt = new Date().toISOString();
  db.users[idx] = current;
  saveDb(db);
  return publicUser(current);
}

export function recordLogin(userId: string): void {
  const db = ensureDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) return;
  db.users[idx].lastLoginAt = new Date().toISOString();
  db.users[idx].updatedAt = new Date().toISOString();
  saveDb(db);
}

/** Require that actor is a super_admin in the local DB. */
export function requireSuperAdmin(actorEmailOrId: string): StoredUser {
  const actor =
    findUserById(actorEmailOrId) || findUserByEmail(actorEmailOrId);
  if (!actor || actor.role !== "super_admin") {
    throw new Error("Super admin access required");
  }
  return actor;
}

export function registerLocalUser(input: {
  email: string;
  password: string;
  fullName: string;
}): User {
  return createUserAccount({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    role: "member",
    membershipStatus: "pending",
  });
}

/**
 * Super admin creates a full login account (stored in data/users.json).
 */
export function createUserByAdmin(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  membershipStatus?: User["membershipStatus"];
  membershipNumber?: string;
  district?: string;
  occupation?: string;
}): User {
  return createUserAccount({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    role: input.role || "member",
    membershipStatus: input.membershipStatus || "active",
    membershipNumber: input.membershipNumber,
    district: input.district,
    occupation: input.occupation,
  });
}

function createUserAccount(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  membershipStatus?: User["membershipStatus"];
  membershipNumber?: string;
  district?: string;
  occupation?: string;
}): User {
  const email = input.email.toLowerCase().trim();
  const fullName = input.fullName.trim();
  const password = input.password;
  const role = input.role || "member";

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  if (!fullName || fullName.length < 2) {
    throw new Error("Enter your full name");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (!isValidRole(role)) {
    throw new Error("Invalid role");
  }

  const db = ensureDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists. Try signing in.");
  }

  const now = new Date().toISOString();
  const isElevated = role !== "member" && role !== "volunteer";
  const user: StoredUser = {
    id: randomUUID(),
    email,
    fullName,
    phone: input.phone?.trim() || undefined,
    role,
    membershipStatus: input.membershipStatus || "pending",
    membershipNumber: input.membershipNumber?.trim() || undefined,
    district: input.district?.trim() || undefined,
    occupation: input.occupation?.trim() || undefined,
    passwordHash: hashPassword(password),
    volunteerHours: 0,
    badges: isElevated ? ["leader"] : ["new-member"],
    createdAt: now,
    updatedAt: now,
    twoFactorEnabled: isElevated,
  };

  db.users.push(user);
  saveDb(db);
  return publicUser(user);
}

export function loginLocalUser(email: string, password: string): User {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  recordLogin(user.id);
  const fresh = findUserById(user.id);
  return publicUser(fresh || user);
}

/** Stable session token (not JWT) for optional cookie use */
export function makeSessionToken(userId: string): string {
  const secret = process.env.AUTH_SECRET || "pyu-local-auth-secret";
  return createHash("sha256").update(`${userId}:${secret}`).digest("hex");
}
