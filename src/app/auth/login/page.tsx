"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/shared/brand-logo";
import { OAuthPanel } from "@/components/auth/oauth-panel";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";
import { toast } from "sonner";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const { login, loading, setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const goAfterLogin = (user: { role?: string; fullName: string }) => {
    toast.success(`Welcome, ${user.fullName.split(" ")[0]}!`);
    if (nextPath) {
      router.push(nextPath);
      return;
    }
    if (user.role === "super_admin") router.push("/super-admin");
    else if (
      user.role === "admin" ||
      user.role === "regional_admin" ||
      user.role === "district_admin"
    )
      router.push("/admin");
    else router.push("/dashboard");
  };

  const handleOAuthSuccess = (user: User) => {
    setUser(user);
    goAfterLogin(user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      goAfterLogin(user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
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
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your email — new accounts are created automatically
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl space-y-5">
          <OAuthPanel mode="login" onSuccess={handleOAuthSuccess} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <button
                type="button"
                className="bg-card px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPasswordForm((v) => !v)}
              >
                {showPasswordForm ? "Hide password login" : "Use password instead"}
              </button>
            </div>
          </div>

          {showPasswordForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
                <Input
                  label="Password"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Sign In with password
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Prefer the full form?{" "}
            <Link
              href="/auth/register"
              className="text-emerald-600 font-semibold hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
