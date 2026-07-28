"use client";

/**
 * Keeps a browser snapshot of all accounts (with password hashes) whenever a
 * super admin is signed in. After a free-host redeploy wipes the server disk,
 * automatically restores accounts from this browser so code deploys never
 * "clear the database" permanently.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import {
  loadUsersSnapshot,
  saveUsersSnapshot,
} from "@/lib/persist/browser-snapshot";

export function DataGuardian() {
  const user = useAuthStore((s) => s.user);
  const ran = useRef(false);

  useEffect(() => {
    if (!user || user.role !== "super_admin") return;
    if (ran.current) return;
    ran.current = true;

    const qs = new URLSearchParams();
    if (user.id) qs.set("actorId", user.id);
    if (user.email) qs.set("actorEmail", user.email);

    void (async () => {
      try {
        // 1) Load full users (with password hashes) from server
        const res = await fetch(`/api/auth/users?${qs}&full=1`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverUsers = (data.users || []) as Array<Record<string, unknown>>;

        // 2) Save snapshot in this browser (survives Render redeploys)
        if (serverUsers.length > 0) {
          saveUsersSnapshot(serverUsers);
        }

        // 3) If server only has tiny bootstrap set but browser has more → restore
        const snap = loadUsersSnapshot();
        if (!snap?.users?.length) return;

        const serverEmails = new Set(
          serverUsers.map((u) => String(u.email || "").toLowerCase())
        );
        const missing = snap.users.filter(
          (u) => u.email && !serverEmails.has(String(u.email).toLowerCase())
        );

        // Also restore if server has fewer accounts than snapshot
        const shouldRestore =
          missing.length > 0 ||
          (snap.users.length >= 3 && serverUsers.length < snap.users.length);

        if (!shouldRestore) return;

        const restoreRes = await fetch("/api/auth/users/restore-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId: user.id,
            actorEmail: user.email,
            users: snap.users,
          }),
        });
        const restoreData = await restoreRes.json();
        if (restoreRes.ok) {
          toast.success("Accounts restored after deploy", {
            description: `${restoreData.count || snap.users.length} accounts available again. Your data was recovered from this browser.`,
            duration: 8000,
          });
          // Refresh snapshot from restored server state
          if (Array.isArray(restoreData.users) && restoreData.users.length) {
            // re-fetch full for hashes
            const again = await fetch(`/api/auth/users?${qs}&full=1`, {
              cache: "no-store",
            });
            if (again.ok) {
              const d2 = await again.json();
              if (Array.isArray(d2.users)) saveUsersSnapshot(d2.users);
            }
          }
        }
      } catch (e) {
        console.warn("[DataGuardian]", e);
      }
    })();
  }, [user]);

  return null;
}
