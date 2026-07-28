"use client";

import { useState } from "react";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  mode?: "login" | "register";
  onSuccess: (user: User) => void;
  className?: string;
};

/** Email OTP sign-in / auto-register (passwordless). Google is a separate button. */
export function OAuthPanel({ mode = "login", onSuccess, className }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const finish = (user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pyu_user", JSON.stringify(user));
    }
    onSuccess(user);
  };

  const requestCode = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (mode === "register" && !fullName.trim()) {
      toast.error("Enter your full name");
      return;
    }
    setBusy(true);
    setDevCode(null);
    try {
      const res = await fetch("/api/auth/oauth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setStep("code");
      if (data.devCode) {
        setDevCode(String(data.devCode));
        toast.message("Your code", {
          description: `Use code ${data.devCode} (email delivery not configured)`,
        });
      } else {
        toast.success(data.message || "Code sent to your email");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/oauth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.replace(/\s/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      toast.success("You're signed in");
      finish(data.user as User);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Continue with email code</strong> —
        new emails are registered automatically.
      </div>

      {step === "email" ? (
        <div className="space-y-3">
          {mode === "register" && (
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As on your ID / card"
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
              placeholder="you@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") void requestCode();
              }}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            variant="outline"
            loading={busy}
            onClick={() => void requestCode()}
          >
            <Mail className="h-4 w-4" />
            Continue with email code
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Code for <strong className="text-foreground">{email}</strong>
            {devCode && (
              <span className="block mt-1 font-mono text-emerald-600">
                Dev code: {devCode}
              </span>
            )}
          </p>
          <div className="relative">
            <KeyRound className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
            <Input
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="pl-10 tracking-[0.3em] font-mono text-lg"
              placeholder="000000"
              onKeyDown={(e) => {
                if (e.key === "Enter") void verifyCode();
              }}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            loading={busy}
            onClick={() => void verifyCode()}
          >
            Verify & sign in
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline w-full text-center"
            onClick={() => {
              setStep("email");
              setCode("");
              setDevCode(null);
            }}
          >
            Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
