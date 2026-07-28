"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  mode?: "login" | "register";
  nextPath?: string;
  className?: string;
  /** Large primary CTA */
  size?: "default" | "lg";
};

/**
 * Big Google button → opens Google account picker on the device
 * (all signed-in Gmail accounts) then auto login / register.
 */
export function GoogleSignInButton({
  mode = "login",
  nextPath = "/dashboard",
  className,
  size = "lg",
}: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [hint, setHint] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/oauth/google", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setEnabled(Boolean(d.enabled));
        setHint(String(d.hint || ""));
      })
      .catch(() => setEnabled(false));
  }, []);

  const startGoogle = useCallback(() => {
    if (enabled === false) {
      toast.error("Google Client ID missing on the server", {
        description:
          "Render → patriotic-app → Environment → add NEXT_PUBLIC_GOOGLE_CLIENT_ID → Save → Manual Deploy → Clear build cache & deploy.",
        duration: 10000,
      });
      return;
    }
    setBusy(true);
    const qs = new URLSearchParams({
      mode,
      next: nextPath.startsWith("/") ? nextPath : "/dashboard",
    });
    // Full redirect → Google shows every account on this device
    window.location.href = `/api/auth/oauth/google/start?${qs.toString()}`;
  }, [enabled, mode, nextPath]);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <button
        type="button"
        onClick={startGoogle}
        disabled={busy || enabled === null}
        className={cn(
          "w-full inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-border bg-white text-gray-800 font-semibold shadow-sm",
          "hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
          size === "lg" ? "h-14 text-base px-5" : "h-12 text-sm px-4"
        )}
        aria-label="Continue with Google"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <GoogleIcon className="h-6 w-6 shrink-0" />
        )}
        <span>
          {mode === "register" ? "Sign up with Google" : "Continue with Google"}
        </span>
      </button>
      <p className="text-[11px] text-center text-muted-foreground leading-snug">
        Tap Google → pick any Gmail on this device → you are signed in or
        registered automatically.
      </p>
      {enabled === false && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
          <p className="font-semibold">Google is not connected on this server yet</p>
          <ol className="list-decimal pl-4 space-y-0.5 text-left">
            <li>Open Render → your service → <strong>Environment</strong></li>
            <li>
              Add key <code className="bg-black/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
            </li>
            <li>Paste the Client ID from Google Cloud (ends with .apps.googleusercontent.com)</li>
            <li>
              Also set <code className="bg-black/10 px-1 rounded">NEXT_PUBLIC_APP_URL</code> ={" "}
              <code className="bg-black/10 px-1 rounded">https://patriotic-app.onrender.com</code>
            </li>
            <li>
              <strong>Manual Deploy</strong> → Clear build cache &amp; deploy (required for NEXT_PUBLIC_ vars)
            </li>
          </ol>
          {hint && <p className="opacity-80 pt-1">Server says: {hint}</p>}
        </div>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
