"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Props = {
  mode?: "login" | "register";
  onSuccess: (user: User) => void;
  className?: string;
};

export function OAuthPanel({ mode = "login", onSuccess, className }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const finish = useCallback(
    (user: User) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("pyu_user", JSON.stringify(user));
      }
      onSuccess(user);
    },
    [onSuccess]
  );

  // Detect Google config from API
  useEffect(() => {
    fetch("/api/auth/oauth/google", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d.enabled)))
      .catch(() => setGoogleEnabled(Boolean(clientId)));
  }, [clientId]);

  // Load Google Identity Services
  useEffect(() => {
    if (!googleEnabled && !clientId) return;
    const id = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!id) return;

    const handleCredential = async (response: { credential: string }) => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth/oauth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign-in failed");
        toast.success("Signed in with Google");
        finish(data.user as User);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    };

    const boot = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: id,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: mode === "register" ? "signup_with" : "continue_with",
        shape: "pill",
      });
      setGoogleReady(true);
    };

    const existing = document.getElementById("google-gis");
    if (existing) {
      boot();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gis";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => boot();
    document.head.appendChild(script);
  }, [googleEnabled, clientId, mode, finish]);

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
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Continue with email</strong> — enter your
        email, get a one-time code. New emails are registered automatically as members.
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
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            size="lg"
            loading={busy}
            onClick={() => void requestCode()}
          >
            <Mail className="h-4 w-4" />
            Continue with email
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Code sent to <strong className="text-foreground">{email}</strong>
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
            size="lg"
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

      {(googleEnabled || clientId) && (
        <>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">or Google</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 min-h-[44px]">
            {!googleReady && busy && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            <div ref={googleBtnRef} className="flex justify-center w-full" />
            {!clientId && googleEnabled === false && (
              <p className="text-[11px] text-muted-foreground text-center">
                Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google button
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
