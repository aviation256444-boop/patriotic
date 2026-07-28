"use client";

import { useState } from "react";
import { KeyRound, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Super admin self-service: edit own login credentials & password.
 * Stored permanently in data/users.json.
 */
export default function SuperAdminAccountPage() {
  const { user, setUser, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!user) return null;

  const save = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setUser(data.user);
      updateUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("pyu_user", JSON.stringify(data.user));
      }

      setForm((f) => ({
        ...f,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        fullName: data.user.fullName,
        email: data.user.email,
        phone: data.user.phone || "",
      }));
      toast.success("Your credentials were saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-red-600" />
          My super admin account
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Change your name, email, phone, or password. Details are stored in the
          login database and remembered on sign-in.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600 text-white">
            <Shield className="h-3 w-3 mr-1" />
            {user.role.replace(/_/g, " ")}
          </Badge>
          {user.lastLoginAt && (
            <span className="text-xs text-muted-foreground">
              Last login: {new Date(user.lastLoginAt).toLocaleString()}
            </span>
          )}
        </div>

        <Input
          label="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          label="Email (login)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change password
          </p>
          <Input
            label="Current password"
            type="password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm({ ...form, currentPassword: e.target.value })
            }
            placeholder="Required only if setting a new password"
          />
          <Input
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Leave blank to keep current"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>

        <Button
          className="w-full bg-red-600 hover:bg-red-500"
          loading={saving}
          onClick={() => void save()}
        >
          Save my credentials
        </Button>
      </div>
    </div>
  );
}
