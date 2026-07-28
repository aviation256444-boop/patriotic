"use client";

/**
 * Admin → Members: real login accounts from data/users.json
 * (not the old hardcoded demo list).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";
import { formatDate } from "@/lib/utils";

type AccountUser = User & { lastLoginAt?: string };

export default function AdminMembersPage() {
  const actor = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!actor?.id && !actor?.email) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (actor.id) qs.set("actorId", actor.id);
      if (actor.email) qs.set("actorEmail", actor.email);
      const res = await fetch(`/api/auth/users?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load members");
      setUsers(data.users || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load members");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.role?.toLowerCase().includes(s) ||
        (u.district || "").toLowerCase().includes(s) ||
        (u.membershipNumber || "").toLowerCase().includes(s)
    );
  }, [users, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-600" />
              Members
            </h1>
            <p className="text-sm text-muted-foreground">
              Live accounts from registration / login ({users.length} total)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, number…"
              className="h-10 rounded-xl border border-border bg-background pl-9 pr-4 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Membership #</th>
                <th className="px-4 py-3 font-semibold">District</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Loading members…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No registered users yet. When someone registers or signs in with Google,
                    they appear here.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((m) => (
                  <tr key={m.id || m.email} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{m.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {m.membershipNumber || "—"}
                    </td>
                    <td className="px-4 py-3">{m.district || "—"}</td>
                    <td className="px-4 py-3 capitalize">{m.role?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          m.membershipStatus === "active" ||
                          m.membershipStatus === "approved"
                            ? "success"
                            : "warning"
                        }
                      >
                        {m.membershipStatus || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {m.createdAt ? formatDate(m.createdAt) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
