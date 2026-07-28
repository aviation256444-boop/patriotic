"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/shared/brand-logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/oauth/google", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d.enabled)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Enter your full name");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await register(form.email.trim(), form.password, form.fullName.trim());
      toast.success("Account created!", {
        description: "You can sign in anytime with this email and password.",
      });
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4 gradient-hero mesh-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-6">
            <BrandLogo href="/" size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register with your name, email, and password
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl space-y-5">
          {/* PRIMARY: normal registration */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              size="lg"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          {/* OPTIONAL: Google */}
          {googleEnabled && (
            <>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">
                    or optional Google
                  </span>
                </div>
              </div>
              <GoogleSignInButton
                mode="register"
                nextPath="/dashboard"
                size="default"
                quiet
              />
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-emerald-600 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
