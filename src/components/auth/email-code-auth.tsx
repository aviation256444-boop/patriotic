"use client";

import { useEffect, useState } from "react";
import { Mail, KeyRound, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  mode?: "login" | "register";
  /** Prefill from the main form above */
  defaultEmail?: string;
  defaultName?: string;
  onSuccess: (user: User) => void;
  className?: string;
};

/**
 * Optional passwordless email login / auto-register.
 * Enter email → 6-digit code → signed in (new users created automatically).
 */
export function EmailCodeAuth({
  mode = "login",
  defaultEmail = "",
  defaultName = "",
  onSuccess,
  className,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [fullName, setFullName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (defaultName) setFullName(defaultName);
  }, [defaultName]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const finish = (user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pyu_user", JSON.stringify(user));
    }
    onSuccess(user);
  };

  const requestCode = async (isResend = false) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      toast.error("Enter a valid email address");
      return;
    }
    if (mode === "register" && step === "email" && !fullName.trim()) {
      toast.error("Enter your full name for the new account");
      return;
    }
    if (cooldown > 0 && isResend) {
      toast.message(`Wait ${cooldown}s before requesting another code`);
      return;
    }

    setBusy(true);
    setDisplayCode(null);
    try {
      const res = await fetch("/api/auth/oauth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: fullName.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");

      setStep("code");
      setIsNewUser(Boolean(data.isNewUser));
      setCooldown(30);

      if (data.devCode || data.displayCode) {
        const c = String(data.devCode || data.displayCode);
        setDisplayCode(c);
        toast.success(
          data.isNewUser
            ? "Account will be created — enter the code below"
            : "Enter the code below to sign in",
          { description: `Code: ${c}` }
        );
      } else {
        toast.success(data.message || "Check your email for a 6-digit code");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const digits = code.replace(/\D/g, "");
    if (!/^\d{6}$/.test(digits)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/oauth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: digits,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      toast.success(
        isNewUser ? "Account created — you're signed in!" : "Signed in with email code"
      );
      finish(data.user as User);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Sign in with email code
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No password needed. New emails are registered automatically as members.
          </p>
        </div>
      </div>

      {step === "email" ? (
        <div className="space-y-3">
          {mode === "register" && (
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              placeholder="you@gmail.com"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void requestCode(false);
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-emerald-500/40 hover:bg-emerald-500/10"
            loading={busy}
            onClick={() => void requestCode(false)}
          >
            <Mail className="h-4 w-4" />
            Send me a login code
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Code for{" "}
              <strong className="text-foreground">{email.trim().toLowerCase()}</strong>
              {isNewUser && (
                <span className="ml-1 text-emerald-600">(new account)</span>
              )}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              onClick={() => {
                setStep("email");
                setCode("");
                setDisplayCode(null);
              }}
            >
              <ArrowLeft className="h-3 w-3" /> Change
            </button>
          </div>

          {displayCode && (
            <div className="rounded-xl border border-dashed border-emerald-500/40 bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Your code
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.35em] text-emerald-600 dark:text-emerald-400">
                {displayCode}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Email delivery is not configured — use this code (valid 10 minutes)
              </p>
            </div>
          )}

          <div className="relative">
            <KeyRound className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
            <Input
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="pl-10 tracking-[0.35em] font-mono text-lg"
              placeholder="000000"
              autoComplete="one-time-code"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void verifyCode();
                }
              }}
            />
          </div>

          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            loading={busy}
            onClick={() => void verifyCode()}
          >
            Verify & continue
          </Button>

          <button
            type="button"
            disabled={busy || cooldown > 0}
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center inline-flex items-center justify-center gap-1 disabled:opacity-50"
            onClick={() => void requestCode(true)}
          >
            <RefreshCw className="h-3 w-3" />
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      )}
    </div>
  );
}
