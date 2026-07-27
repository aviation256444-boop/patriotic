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
  return rest;
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

export function findUserByEmail(email: string): StoredUser | null {
  const db = ensureDb();
  return db.users.find((u) => u.email === email.toLowerCase().trim()) || null;
}

export function registerLocalUser(input: {
  email: string;
  password: string;
  fullName: string;
}): User {
  const email = input.email.toLowerCase().trim();
  const fullName = input.fullName.trim();
  const password = input.password;

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  if (!fullName || fullName.length < 2) {
    throw new Error("Enter your full name");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const db = ensureDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists. Try signing in.");
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    email,
    fullName,
    role: "member",
    membershipStatus: "pending",
    passwordHash: hashPassword(password),
    volunteerHours: 0,
    badges: ["new-member"],
    createdAt: now,
    updatedAt: now,
    twoFactorEnabled: false,
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
  return publicUser(user);
}

/** Stable session token (not JWT) for optional cookie use */
export function makeSessionToken(userId: string): string {
  const secret = process.env.AUTH_SECRET || "pyu-local-auth-secret";
  return createHash("sha256").update(`${userId}:${secret}`).digest("hex");
}
