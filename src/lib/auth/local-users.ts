/**
 * File-backed user registry.
 * Stored at data/users.json with .bak + data/backups restore copies.
 * Accounts and history are never wiped unless an admin explicitly resets.
 */

import { createHash, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { join } from "path";
import type { MembershipStatus, User, UserRole } from "@/types";
import {
  ensureDir,
  readJsonFile,
  writeWithBackup,
} from "@/lib/persist/atomic-file";
import { logActivity } from "@/lib/activity/log";

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
  ensureDir(DATA_DIR);
  // readJsonFile already tries .bak + data/backups/* before giving up
  // and re-writes the primary file only when recovering from a backup
  const parsed = readJsonFile<UsersDb>(USERS_FILE);
  if (parsed?.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
    return parsed;
  }
  // Truly empty first boot only — create bootstrap admins (does NOT run if backup restored)
  console.warn("[users] No users found — creating bootstrap admin accounts only");
  const seed = seedBootstrapUsers();
  saveDb(seed);
  return seed;
}

function saveDb(db: UsersDb) {
  ensureDir(DATA_DIR);
  writeWithBackup(USERS_FILE, JSON.stringify(db, null, 2));
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _pw, ...rest } = u;
  void _pw;
  return {
    ...rest,
    lastLoginAt: u.lastLoginAt,
  };
}

/** Public export for API routes */
export function publicUserFromStored(u: StoredUser): User {
  return publicUser(u);
}

/** Ensure super_admin always has full privilege pack; returns updated row */
export function applyRolePrivilegesIfSuper(u: StoredUser): StoredUser {
  if (!isSuperAdminRole(u.role)) return u;
  applyRolePrivileges(u, "super_admin");
  const db = ensureDb();
  const idx = db.users.findIndex((x) => x.id === u.id);
  if (idx >= 0) {
    db.users[idx] = {
      ...db.users[idx],
      role: "super_admin",
      membershipStatus: u.membershipStatus,
      badges: u.badges,
      twoFactorEnabled: u.twoFactorEnabled,
      membershipNumber: u.membershipNumber || db.users[idx].membershipNumber,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    return db.users[idx];
  }
  return u;
}

/**
 * First-run bootstrap only. Passwords can be overridden with env:
 * SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD
 * Never displayed on the public login page.
 */
function seedBootstrapUsers(): UsersDb {
  const now = new Date().toISOString();
  const superEmail = (
    process.env.SUPER_ADMIN_EMAIL || "superadmin@pyu.ug"
  ).toLowerCase();
  const superPass = process.env.SUPER_ADMIN_PASSWORD || "super1234";
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@pyu.ug").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "admin1234";

  const users: StoredUser[] = [
    {
      id: "bootstrap-super-1",
      email: superEmail,
      fullName: "Site Super Admin",
      role: "super_admin",
      membershipStatus: "active",
      membershipNumber: "PYU-2022-000001",
      passwordHash: hashPassword(superPass),
      volunteerHours: 0,
      badges: ["leader"],
      createdAt: now,
      updatedAt: now,
      twoFactorEnabled: true,
    },
    {
      id: "bootstrap-admin-1",
      email: adminEmail,
      fullName: "Site Admin",
      role: "admin",
      membershipStatus: "active",
      membershipNumber: "PYU-2023-000001",
      passwordHash: hashPassword(adminPass),
      volunteerHours: 0,
      badges: ["leader"],
      createdAt: now,
      updatedAt: now,
      twoFactorEnabled: true,
    },
  ];

  return { users };
}

/**
 * Ensure any signed-in identity (local or Firebase/social) is stored in
 * data/users.json so Super Admin → Users always lists real accounts.
 */
export function ensureUserRecord(input: {
  id?: string;
  email: string;
  fullName?: string;
  phone?: string;
  photoURL?: string;
  role?: UserRole;
  membershipStatus?: User["membershipStatus"];
}): User {
  const email = String(input.email || "")
    .toLowerCase()
    .trim();
  if (!email || !email.includes("@")) {
    throw new Error("Valid email required");
  }

  const db = ensureDb();
  const byId = input.id
    ? db.users.findIndex((u) => u.id === input.id)
    : -1;
  const byEmail = db.users.findIndex((u) => u.email === email);
  const idx = byId >= 0 ? byId : byEmail;

  if (idx >= 0) {
    const cur = db.users[idx];
    if (input.fullName?.trim()) cur.fullName = input.fullName.trim();
    if (input.phone !== undefined) cur.phone = input.phone || undefined;
    if (input.photoURL !== undefined) cur.photoURL = input.photoURL || undefined;
    // Never downgrade an elevated role via ensure
    if (
      input.role &&
      isValidRole(input.role) &&
      cur.role === "member" &&
      input.role !== "member"
    ) {
      applyRolePrivileges(cur, input.role);
    }
    // Keep super_admin (and other elevated) privilege packs intact on every login
    if (cur.role === "super_admin" || isElevatedRole(cur.role)) {
      applyRolePrivileges(cur, cur.role);
    }
    if (!cur.membershipNumber) cur.membershipNumber = nextMembershipNumber();
    cur.lastLoginAt = new Date().toISOString();
    cur.updatedAt = cur.lastLoginAt;
    db.users[idx] = cur;
    saveDb(db);
    return publicUser(cur);
  }

  const now = new Date().toISOString();
  const role: UserRole =
    input.role && isValidRole(input.role) ? input.role : "member";
  const user: StoredUser = {
    id: input.id || randomUUID(),
    email,
    fullName: (input.fullName || email.split("@")[0] || "Member").trim(),
    phone: input.phone || undefined,
    photoURL: input.photoURL || undefined,
    role,
    membershipStatus: input.membershipStatus || "active",
    membershipNumber: nextMembershipNumber(),
    // Random password — Firebase/social users set a password via admin if needed
    passwordHash: hashPassword(randomUUID() + randomUUID()),
    volunteerHours: 0,
    badges: role === "member" ? ["new-member"] : ["leader"],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    twoFactorEnabled: role !== "member" && role !== "volunteer",
  };
  db.users.push(user);
  saveDb(db);
  logActivity({
    kind: "register",
    action: `Account recorded: ${user.email} (${user.role})`,
    actor: user.email,
    target: user.id,
  });
  return publicUser(user);
}

export function exportUsersDb(): UsersDb {
  return ensureDb();
}

/** Full rows including password hashes — super-admin backup only */
export function exportUsersWithSecrets(): StoredUser[] {
  return ensureDb().users.map((u) => ({ ...u }));
}

export function importUsersDb(data: unknown, merge = true): number {
  const incoming = data as UsersDb;
  if (!incoming || !Array.isArray(incoming.users)) {
    throw new Error("Invalid users backup");
  }
  if (!merge) {
    saveDb({ users: incoming.users as StoredUser[] });
    return incoming.users.length;
  }
  const db = ensureDb();
  let added = 0;
  for (const u of incoming.users as StoredUser[]) {
    if (!u?.email || !u?.passwordHash) continue;
    const i = db.users.findIndex(
      (x) => x.email === u.email.toLowerCase() || x.id === u.id
    );
    if (i >= 0) {
      db.users[i] = { ...db.users[i], ...u, email: u.email.toLowerCase() };
    } else {
      db.users.push({ ...u, email: u.email.toLowerCase() });
      added += 1;
    }
  }
  saveDb(db);
  return added;
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

/** Resolve a user by id or email (session often has one, DB the other). */
export function findUserFlexible(
  ...ids: Array<string | null | undefined>
): StoredUser | null {
  for (const raw of ids) {
    if (!raw) continue;
    const s = String(raw).trim();
    if (!s) continue;
    const byId = findUserById(s);
    if (byId) return byId;
    if (s.includes("@")) {
      const byEmail = findUserByEmail(s);
      if (byEmail) return byEmail;
    }
  }
  return null;
}

/** Normalize role strings from forms / JSON / DB */
export function normalizeRole(role: unknown): UserRole {
  const r = String(role || "member")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
  if (r === "superadmin" || r === "super" || r === "owner") return "super_admin";
  if (isValidRole(r)) return r;
  return "member";
}

export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRole(role) === "super_admin";
}

export function countSuperAdmins(): number {
  return ensureDb().users.filter((u) => isSuperAdminRole(u.role)).length;
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

export function isElevatedRole(role: UserRole): boolean {
  return role !== "member" && role !== "volunteer";
}

/**
 * Full privilege packs when someone is promoted (or demoted).
 * Super admin gets complete system powers: active membership, leader badges, staff flags.
 */
export function privilegesForRole(role: UserRole): {
  membershipStatus: MembershipStatus;
  badges: string[];
  twoFactorEnabled: boolean;
} {
  if (role === "super_admin") {
    return {
      membershipStatus: "active",
      badges: [
        "super-admin",
        "full-access",
        "leader",
        "staff",
        "cms-editor",
        "payments-admin",
        "user-manager",
      ],
      twoFactorEnabled: true,
    };
  }
  if (role === "admin") {
    return {
      membershipStatus: "active",
      badges: ["admin", "leader", "staff", "cms-editor"],
      twoFactorEnabled: true,
    };
  }
  if (role === "regional_admin" || role === "district_admin") {
    return {
      membershipStatus: "active",
      badges: ["leader", "staff", role.replace(/_/g, "-")],
      twoFactorEnabled: true,
    };
  }
  if (role === "volunteer") {
    return {
      membershipStatus: "active",
      badges: ["volunteer"],
      twoFactorEnabled: false,
    };
  }
  return {
    membershipStatus: "active",
    badges: ["new-member"],
    twoFactorEnabled: false,
  };
}

function applyRolePrivileges(user: StoredUser, role: UserRole): void {
  user.role = role;
  const pack = privilegesForRole(role);
  user.membershipStatus = pack.membershipStatus;
  user.twoFactorEnabled = pack.twoFactorEnabled;
  // Merge badges — keep existing non-conflicting ones, ensure pack is present
  const existing = new Set(user.badges || []);
  // Drop old role badges that no longer apply
  const roleBadgeTokens = [
    "super-admin",
    "full-access",
    "admin",
    "leader",
    "staff",
    "cms-editor",
    "payments-admin",
    "user-manager",
    "volunteer",
    "new-member",
    "regional-admin",
    "district-admin",
  ];
  for (const b of roleBadgeTokens) existing.delete(b);
  for (const b of pack.badges) existing.add(b);
  user.badges = Array.from(existing);
  if (!user.membershipNumber) {
    user.membershipNumber = nextMembershipNumber();
  }
}

/**
 * Super admin: update another user's profile credentials and/or role.
 * Passwords set via setUserPassword.
 * Promoting to super_admin applies the full privilege pack.
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
  const previousRole = current.role;
  const previousMembershipStatus = current.membershipStatus;
  const previousMembershipNumber = current.membershipNumber;

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
    applyRolePrivileges(current, patch.role);
  }

  // Explicit membership fields can still override (except we always force active for super_admin)
  if (patch.membershipStatus !== undefined && current.role !== "super_admin") {
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

  // Super admin always keeps full power pack even if only other fields updated
  if (current.role === "super_admin") {
    applyRolePrivileges(current, "super_admin");
  }

  current.updatedAt = new Date().toISOString();
  db.users[idx] = current;
  saveDb(db);
  logActivity({
    kind: "user_update",
    action:
      patch.role && patch.role !== previousRole
        ? `Promoted ${current.email}: ${previousRole} → ${patch.role} (full privileges applied)`
        : `Updated user ${current.email}`,
    target: current.id,
    meta: {
      fields: Object.keys(patch),
      previousRole,
      role: current.role,
      badges: current.badges,
    },
  });

  // Real-time membership notifications (not static demo)
  try {
    const { createNotification } = require("@/lib/notifications/store") as typeof import("@/lib/notifications/store");
    if (
      patch.membershipStatus &&
      patch.membershipStatus !== previousMembershipStatus
    ) {
      createNotification({
        sourceKey: `membership-status:${current.id}:${patch.membershipStatus}:${Date.now()}`,
        audience: "user",
        userId: current.id,
        userEmail: current.email,
        type: "membership",
        title: `Membership ${String(patch.membershipStatus).replace(/_/g, " ")}`,
        message: `Your membership status is now "${patch.membershipStatus}". Open your digital card for details.`,
        link: "/dashboard/membership",
      });
    }
    if (patch.membershipNumber && patch.membershipNumber !== previousMembershipNumber) {
      createNotification({
        sourceKey: `membership-number:${current.id}:${patch.membershipNumber}`,
        audience: "user",
        userId: current.id,
        userEmail: current.email,
        type: "membership",
        title: "Membership number assigned",
        message: `Your membership number is ${patch.membershipNumber}.`,
        link: "/dashboard/membership",
      });
    }
    if (patch.role && patch.role !== previousRole) {
      createNotification({
        sourceKey: `role-change:${current.id}:${patch.role}:${Date.now()}`,
        audience: "user",
        userId: current.id,
        userEmail: current.email,
        type: "system",
        title: "Account role updated",
        message: `Your role is now ${String(patch.role).replace(/_/g, " ")}. Sign out and back in if menus look outdated.`,
        link: "/dashboard",
      });
    }
  } catch {
    /* non-blocking */
  }

  return publicUser(current);
}

/** Promote any user to super_admin with full powers (convenience). */
export function promoteToSuperAdmin(userId: string, actorEmail?: string): User {
  const user = updateUserByAdmin(userId, { role: "super_admin" });
  logActivity({
    kind: "user_update",
    action: `Granted full super admin powers to ${user.email}`,
    actor: actorEmail,
    target: user.id,
    meta: { role: "super_admin", badges: user.badges },
  });
  return user;
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
  logActivity({
    kind: "user_password",
    action: `Password changed for ${db.users[idx].email}`,
    target: userId,
  });
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
  const actor = findUserFlexible(actorEmailOrId);
  if (!actor || !isSuperAdminRole(actor.role)) {
    throw new Error("Super admin access required");
  }
  // Ensure privilege pack is complete every time they act as super admin
  if (actor.role === "super_admin") {
    applyRolePrivileges(actor, "super_admin");
    const db = ensureDb();
    const idx = db.users.findIndex((u) => u.id === actor.id);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], ...actor };
      saveDb(db);
    }
  }
  return actor;
}

/** Try id then email (session may use Firebase uid while DB uses local id). */
export function requireSuperAdminAny(
  ...ids: Array<string | null | undefined>
): StoredUser {
  const actor = findUserFlexible(...ids);
  if (!actor || !isSuperAdminRole(actor.role)) {
    throw new Error("Super admin access required");
  }
  // Re-apply full super powers so promoted users always have complete access
  applyRolePrivileges(actor, "super_admin");
  const db = ensureDb();
  const idx = db.users.findIndex((u) => u.id === actor.id);
  if (idx >= 0) {
    db.users[idx] = {
      ...db.users[idx],
      role: "super_admin",
      membershipStatus: actor.membershipStatus,
      badges: actor.badges,
      twoFactorEnabled: actor.twoFactorEnabled,
      membershipNumber: actor.membershipNumber,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    return db.users[idx];
  }
  return actor;
}

const STAFF_ROLES: UserRole[] = [
  "admin",
  "super_admin",
  "regional_admin",
  "district_admin",
];

/** Admin or super admin may list registered login accounts. */
export function requireStaffAny(
  ...ids: Array<string | null | undefined>
): StoredUser {
  const actor = findUserFlexible(...ids);
  if (!actor || !STAFF_ROLES.includes(normalizeRole(actor.role))) {
    throw new Error("Admin access required");
  }
  return actor;
}

export function nextMembershipNumber(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PYU-${year}-${n}`;
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
    membershipStatus: "active",
    membershipNumber: nextMembershipNumber(),
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
  const user: StoredUser = {
    id: randomUUID(),
    email,
    fullName,
    phone: input.phone?.trim() || undefined,
    role,
    membershipStatus: input.membershipStatus || "pending",
    membershipNumber:
      input.membershipNumber?.trim() || nextMembershipNumber(),
    district: input.district?.trim() || undefined,
    occupation: input.occupation?.trim() || undefined,
    passwordHash: hashPassword(password),
    volunteerHours: 0,
    badges: [],
    createdAt: now,
    updatedAt: now,
    twoFactorEnabled: false,
  };
  // Full privilege pack for the chosen role (super_admin → all powers)
  applyRolePrivileges(user, role);
  if (input.membershipStatus && role !== "super_admin") {
    user.membershipStatus = input.membershipStatus;
  }

  db.users.push(user);
  saveDb(db);
  logActivity({
    kind: "user_create",
    action: `Created account ${user.email} (${user.role})`,
    target: user.id,
    meta: { role: user.role },
  });
  return publicUser(user);
}

export function loginLocalUser(email: string, password: string): User {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  recordLogin(user.id);
  logActivity({
    kind: "login",
    action: `Signed in: ${user.email}`,
    actor: user.email,
    target: user.id,
    meta: { role: user.role },
  });
  const fresh = findUserById(user.id);
  return publicUser(fresh || user);
}

/** Stable session token (not JWT) for optional cookie use */
export function makeSessionToken(userId: string): string {
  const secret = process.env.AUTH_SECRET || "pyu-local-auth-secret";
  return createHash("sha256").update(`${userId}:${secret}`).digest("hex");
}
