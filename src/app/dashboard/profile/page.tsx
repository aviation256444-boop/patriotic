"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Shield,
  CreditCard,
  Save,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getInitials, cn } from "@/lib/utils";
import {
  compressImageForUpload,
  COMPRESS_PRESETS,
} from "@/lib/upload/compress-image";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    district: user?.district || "",
    subCounty: user?.subCounty || "",
    occupation: user?.occupation || "",
    education: user?.education || "",
  });

  const persistProfile = useCallback(
    async (patch: Record<string, string | undefined>) => {
      if (!user) return null;
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user.id,
          actorEmail: user.email,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save profile");
      if (data.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("pyu_user", JSON.stringify(data.user));
        }
        return data.user;
      }
      return null;
    },
    [user, setUser]
  );

  if (!user) return null;

  const displayPhoto = photoPreview || user.photoURL || "";

  const onPickPhoto = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG or PNG)");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImageForUpload(file, {
        ...COMPRESS_PRESETS.logo,
        maxEdge: 800,
        maxBytes: 400 * 1024,
        nameHint: "avatar",
      });
      const toUpload = compressed.file;

      // Local preview immediately
      if (compressed.dataUrl) {
        setPhotoPreview(compressed.dataUrl);
      } else {
        setPhotoPreview(URL.createObjectURL(toUpload));
      }

      const fd = new FormData();
      fd.append("file", toUpload, toUpload.name || "avatar.jpg");
      fd.append("actor", user.email || user.id);
      fd.append("preferInline", "1");

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Upload failed");

      const url =
        upData.url ||
        upData.secure_url ||
        upData.dataUrl ||
        compressed.dataUrl ||
        "";
      if (!url) throw new Error("Upload succeeded but no image URL returned");

      setPhotoPreview(url);
      await persistProfile({ photoURL: url });
      toast.success("Profile photo updated", {
        description: "Your membership card and header will show the new photo.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await persistProfile({
        fullName: form.fullName,
        phone: form.phone,
        district: form.district,
        subCounty: form.subCounty,
        occupation: form.occupation,
        education: form.education,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Member portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
          Personal profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage your photo and details. Changes update your digital membership
          card and account everywhere.
        </p>
      </div>

      {/* Hero identity card */}
      <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-xl">
        <div className="h-28 sm:h-32 bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 relative">
          <div className="absolute inset-0 flag-stripe opacity-90 h-1.5 top-0" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(252,220,4,0.35), transparent 50%), radial-gradient(circle at 90% 20%, rgba(217,0,0,0.3), transparent 45%)",
            }}
          />
        </div>

        <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative group shrink-0">
              <div
                className={cn(
                  "h-28 w-28 sm:h-32 sm:w-32 rounded-3xl overflow-hidden ring-4 ring-card shadow-2xl bg-muted",
                  "border border-white/20"
                )}
              >
                {displayPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayPhoto}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600/30 to-zinc-800 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {getInitials(user.fullName)}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-card hover:bg-emerald-500 transition-colors disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void onPickPhoto(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                  {form.fullName || user.fullName}
                </h2>
                <Badge
                  variant={
                    user.membershipStatus === "active" ? "success" : "warning"
                  }
                  className="capitalize"
                >
                  {user.membershipStatus || "member"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
              {user.membershipNumber && (
                <p className="text-xs font-mono text-emerald-600 mt-1">
                  {user.membershipNumber}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Tap the camera to upload a JPG or PNG. Photo appears on your
                membership card.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard/membership">
              <Button size="sm" variant="outline">
                <CreditCard className="h-4 w-4" /> Membership card
              </Button>
            </Link>
            <Link href="/dashboard/events">
              <Button size="sm" variant="outline">
                My events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Details form */}
      <form
        onSubmit={(e) => void save(e)}
        className="rounded-3xl border border-border/50 bg-card p-5 sm:p-8 space-y-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <UserIcon className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold text-lg">Profile details</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input label="Email" value={user.email} disabled />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="07xx xxx xxx"
          />
          <Input
            label="District"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="e.g. Kampala"
          />
          <Input
            label="Sub-county / area"
            value={form.subCounty}
            onChange={(e) => setForm({ ...form, subCounty: e.target.value })}
          />
          <Input
            label="Occupation"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Education"
              value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
              placeholder="e.g. Bachelor's, Diploma, Secondary"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
            <MapPin className="h-4 w-4 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-semibold">
                {form.district || "Not set"}
                {form.subCounty ? ` · ${form.subCounty}` : ""}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Work</p>
              <p className="text-sm font-semibold">
                {form.occupation || "Not set"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Education</p>
              <p className="text-sm font-semibold">
                {form.education || "Not set"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" loading={saving} className="bg-emerald-600 hover:bg-emerald-500">
            <Save className="h-4 w-4" />
            Save profile
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            Role:{" "}
            <span className="font-semibold capitalize">
              {user.role.replace(/_/g, " ")}
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
