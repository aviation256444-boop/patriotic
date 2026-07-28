"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import type { User } from "@/types";

type Props = {
  mode?: "login" | "register";
  nextPath?: string;
  className?: string;
  size?: "default" | "lg";
  /** kept for compatibility — button is always shown */
  quiet?: boolean;
};

/** Public Web Client ID (not a secret). Must match Google Cloud Console. */
const GOOGLE_CLIENT_ID =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()) ||
  "868445110488-pj1f968b1a5f444bva2hkl9gc4v550uu.apps.googleusercontent.com";

type CredentialResponse = { credential: string; select_by?: string };

type PromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (listener?: (n: PromptNotification) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-google-gis="1"]'
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Sign-In")),
        { once: true }
      );
      // Already loaded between checks
      if (window.google?.accounts?.id) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.dataset.googleGis = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(s);
  });
}

/**
 * Compliant Google sign-in via Google Identity Services (GIS).
 * Does NOT use OAuth implicit response_type=id_token (blocked by Google policy).
 * Tap → account chooser → JWT credential → POST /api/auth/oauth/google → session.
 */
export function GoogleSignInButton({
  mode = "login",
  nextPath = "/dashboard",
  className,
  size = "default",
}: Props) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const gisHostRef = useRef<HTMLDivElement>(null);
  const nextPathRef = useRef(nextPath);
  const modeRef = useRef(mode);

  nextPathRef.current = nextPath;
  modeRef.current = mode;

  const routeAfterLogin = useCallback(
    (user: User) => {
      const next = nextPathRef.current.startsWith("/")
        ? nextPathRef.current
        : "/dashboard";
      if (user.role === "super_admin") router.replace("/super-admin");
      else if (
        user.role === "admin" ||
        user.role === "regional_admin" ||
        user.role === "district_admin"
      )
        router.replace("/admin");
      else if (next && next !== "/dashboard") router.replace(next);
      else router.replace("/dashboard");
    },
    [router]
  );

  const finishWithCredential = useCallback(
    async (credential: string) => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth/oauth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Google sign-in failed");
        }
        const user = data.user as User;
        setUser(user);
        try {
          localStorage.setItem("pyu_user", JSON.stringify(user));
        } catch {
          /* ignore */
        }
        toast.success(`Welcome, ${user.fullName.split(" ")[0]}!`);
        routeAfterLogin(user);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Google sign-in failed";
        toast.error(msg);
        setBusy(false);
      }
    },
    [routeAfterLogin, setUser]
  );

  const finishRef = useRef(finishWithCredential);
  finishRef.current = finishWithCredential;

  // Load GIS once and keep a full-width official button as reliable fallback
  useEffect(() => {
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              void finishRef.current(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: modeRef.current === "register" ? "signup" : "signin",
          itp_support: true,
          use_fedcm_for_prompt: true,
        });

        const host = gisHostRef.current;
        if (host) {
          host.innerHTML = "";
          const width = Math.min(
            400,
            Math.max(280, host.parentElement?.clientWidth || 320)
          );
          window.google.accounts.id.renderButton(host, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: modeRef.current === "register" ? "signup_with" : "continue_with",
            shape: "rectangular",
            width,
            logo_alignment: "left",
          });
        }

        setGisReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            "Could not load Google Sign-In. Check your network and try again."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const startGoogle = useCallback(() => {
    if (!window.google?.accounts?.id) {
      toast.error("Google Sign-In is still loading — wait a second and try again.");
      return;
    }
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.length < 20) {
      toast.error("Google Client ID is not configured.");
      return;
    }

    setBusy(true);

    // Re-init so context matches current mode, then open account chooser
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) {
          void finishRef.current(response.credential);
        } else {
          setBusy(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: mode === "register" ? "signup" : "signin",
      itp_support: true,
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.prompt((notification) => {
      // One Tap / FedCM may be blocked; fall back to official GIS button click
      if (
        notification.isNotDisplayed() ||
        notification.isSkippedMoment() ||
        notification.isDismissedMoment()
      ) {
        const btn = gisHostRef.current?.querySelector(
          'div[role="button"]'
        ) as HTMLElement | null;
        if (btn) {
          btn.click();
        } else {
          toast.message("Use the Google button below to pick your account.");
        }
        setBusy(false);
      }
      // If prompt is visible, keep busy until credential callback or dismiss
      if (notification.isDismissedMoment()) {
        setBusy(false);
      }
    });

    // Safety: if nothing happens, clear spinner
    window.setTimeout(() => setBusy(false), 8000);
  }, [mode]);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <button
        type="button"
        onClick={startGoogle}
        disabled={busy}
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

      {/* Official GIS button — policy-compliant account picker (always available) */}
      <div
        ref={gisHostRef}
        className={cn(
          "w-full flex justify-center min-h-[44px]",
          !gisReady && "opacity-50"
        )}
        aria-label="Google Sign-In"
      />

      <p className="text-[11px] text-center text-muted-foreground leading-snug">
        Tap Google to choose any Gmail account on this device. New accounts are
        created automatically. Password login stays available above.
      </p>
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
