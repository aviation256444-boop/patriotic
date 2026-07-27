"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    district: user?.district || "",
    occupation: user?.occupation || "",
    education: user?.education || "",
  });

  if (!user) return null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(form);
    toast.success("Profile updated!");
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Personal Profile</h1>
      <form onSubmit={save} className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input label="Email" value={user.email} disabled />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
        <Input label="Education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  );
}
