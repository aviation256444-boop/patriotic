/**
 * Browser-side snapshot of login accounts so free-host redeploys
 * (which wipe the server disk) do not permanently erase users.
 *
 * Super Admin layout saves a snapshot after loading users.
 * On next visit, if the server only has bootstrap accounts, we restore.
 */

"use client";

const KEY = "pyu_users_snapshot_v1";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type UsersSnapshot = {
  savedAt: string;
  users: Array<Record<string, unknown>>;
};

export function saveUsersSnapshot(users: Array<Record<string, unknown>>) {
  if (typeof window === "undefined") return;
  try {
    // Strip nothing — password hashes are not in public list; only public user fields
    const payload: UsersSnapshot = {
      savedAt: new Date().toISOString(),
      users: users.map((u) => ({ ...u })),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadUsersSnapshot(): UsersSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UsersSnapshot;
    if (!parsed?.users || !Array.isArray(parsed.users)) return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (Number.isFinite(age) && age > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUsersSnapshot() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
