"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, loginWithFacebook, loginWithApple, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}!`);
      if (user.role === "super_admin") router.push("/super-admin");
      else if (user.role === "admin" || user.role === "regional_admin" || user.role === "district_admin")
        router.push("/admin");
      else router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  const socialLogin = async (provider: "google" | "facebook" | "apple") => {
    try {
      const fn = provider === "google" ? loginWithGoogle : provider === "facebook" ? loginWithFacebook : loginWithApple;
      const user = await fn();
      toast.success(`Welcome, ${user.fullName.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Social login failed");
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
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your PYU account</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl">
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
              <Link href="/auth/forgot-password" className="text-xs text-emerald-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button type="button" variant="outline" onClick={() => socialLogin("google")} disabled={loading}>
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => socialLogin("facebook")} disabled={loading}>
              Facebook
            </Button>
            <Button type="button" variant="outline" onClick={() => socialLogin("apple")} disabled={loading}>
              Apple
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-emerald-600 font-semibold hover:underline">
              Register
            </Link>
          </p>

          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Demo accounts:</p>
            <p>member@pyu.ug / demo1234</p>
            <p>admin@pyu.ug / admin1234</p>
            <p>superadmin@pyu.ug / super1234</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
