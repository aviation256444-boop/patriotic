"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { User, UserRole, MembershipStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccountUser = User & { lastLoginAt?: string };

const ROLES: { value: UserRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "volunteer", label: "Volunteer" },
  { value: "district_admin", label: "District Admin" },
  { value: "regional_admin", label: "Regional Admin" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const STATUSES: { value: MembershipStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

function roleBadge(role: string) {
  if (role === "super_admin") return "bg-red-600 text-white";
  if (role === "admin") return "bg-emerald-600 text-white";
  if (role.includes("admin")) return "bg-amber-500 text-black";
  return "bg-muted text-foreground";
}

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  role: "member" as UserRole,
  membershipStatus: "active" as MembershipStatus,
  membershipNumber: "",
  district: "",
  password: "",
};

export default function SuperAdminUsersPage() {
  const { user: actor, setUser, updateUser } = useAuthStore();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  /** null = closed, "create" = new user, AccountUser = edit */
  const [modal, setModal] = useState<"create" | AccountUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isCreate = modal === "create";
  const editing = modal && modal !== "create" ? modal : null;

  const load = useCallback(async () => {
    if (!actor?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/users?actorId=${encodeURIComponent(actor.id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [actor?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.role.toLowerCase().includes(s) ||
        (u.phone || "").includes(s)
    );
  }, [users, q]);

  const openCreate = () => {
    setForm({ ...emptyForm, password: "", membershipStatus: "active", role: "member" });
    setModal("create");
  };

  const openEdit = (u: AccountUser) => {
    setForm({
      fullName: u.fullName || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role,
      membershipStatus: (u.membershipStatus || "active") as MembershipStatus,
      membershipNumber: u.membershipNumber || "",
      district: u.district || "",
      password: "",
    });
    setModal(u);
  };

  const closeModal = () => setModal(null);

  const save = async () => {
    if (!actor?.id || !modal) return;

    if (isCreate && !form.password.trim()) {
      toast.error("Password is required for new users");
      return;
    }
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSaving(true);
    try {
      if (isCreate) {
        const res = await fetch("/api/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId: actor.id,
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
            phone: form.phone,
            role: form.role,
            membershipStatus: form.membershipStatus,
            membershipNumber: form.membershipNumber,
            district: form.district,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create user");
        toast.success("User account created — they can sign in now");
        closeModal();
        await load();
        return;
      }

      const body: Record<string, unknown> = {
        actorId: actor.id,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        membershipStatus: form.membershipStatus,
        membershipNumber: form.membershipNumber,
        district: form.district,
      };
      if (form.password.trim()) body.password = form.password.trim();

      const res = await fetch(`/api/auth/users/${editing!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      toast.success(
        form.password.trim()
          ? "Credentials & password updated"
          : "User credentials updated"
      );

      if (editing!.id === actor.id && data.user) {
        setUser(data.user);
        updateUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("pyu_user", JSON.stringify(data.user));
        }
      }

      closeModal();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const promoteSuper = async (u: AccountUser) => {
    if (!actor?.id) return;
    if (
      !confirm(
        `Make ${u.fullName} a Super Admin? They will have full control of the system.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: actor.id, role: "super_admin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Promotion failed");
      toast.success(`${u.fullName} is now a Super Admin`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Promotion failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-red-600" />
            User accounts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Login details are stored in the database (
            <code className="text-xs bg-muted px-1 rounded">data/users.json</code>
            ). Add users, edit credentials, reset passwords, or promote to Super Admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={openCreate}
          >
            <UserPlus className="h-4 w-4" /> Add new user
          </Button>
          <Button variant="outline" onClick={() => void load()} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, role…"
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        <Badge variant="outline" className="w-fit">
          {filtered.length} account{filtered.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name / Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Loading accounts…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-border/40 hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.phone && (
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                    )}
                    {u.id === actor?.id && (
                      <Badge className="mt-1 text-[10px]" variant="secondary">
                        You
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        roleBadge(u.role)
                      )}
                    >
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {u.membershipStatus || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {u.role !== "super_admin" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void promoteSuper(u)}
                        >
                          <Shield className="h-3.5 w-3.5" /> Make super admin
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {isCreate ? (
                    <>
                      <UserPlus className="h-5 w-5 text-red-600" />
                      Add new user
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-5 w-5 text-red-600" />
                      Edit credentials
                    </>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isCreate
                    ? "Creates a login account in the database. They can sign in immediately."
                    : "Changes are saved to the user database and used on next login."}
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-sm"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input
              label="Email (login)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as UserRole })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Membership status</label>
                <select
                  value={form.membershipStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      membershipStatus: e.target.value as MembershipStatus,
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Membership number"
              value={form.membershipNumber}
              onChange={(e) =>
                setForm({ ...form, membershipNumber: e.target.value })
              }
            />
            <Input
              label="District"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />

            <div
              className={cn(
                "rounded-xl border p-3 space-y-2",
                isCreate
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-amber-500/30 bg-amber-500/10"
              )}
            >
              <p className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {isCreate ? "Login password (required)" : "Reset password (optional)"}
              </p>
              <Input
                label={isCreate ? "Password" : "New password"}
                type="password"
                placeholder={
                  isCreate
                    ? "Min 6 characters"
                    : "Leave blank to keep current password"
                }
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={isCreate}
              />
              <p className="text-[11px] text-muted-foreground">
                {isCreate
                  ? "Share this email and password with the user so they can sign in."
                  : "Minimum 6 characters. User will sign in with this password next time."}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-500"
                loading={saving}
                onClick={() => void save()}
              >
                {isCreate ? "Create user" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
