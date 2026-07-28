"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import type { User } from "@/types";

/**
 * Google redirects here with #id_token=...&state=...
 * Completes login / auto-register, then routes the user.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [message, setMessage] = useState("Finishing Google sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Implicit flow returns tokens in the URL hash
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const idToken =
          params.get("id_token") ||
          new URLSearchParams(window.location.search).get("id_token");
        const error =
          params.get("error") ||
          new URLSearchParams(window.location.search).get("error");

        let nextPath = "/dashboard";
        try {
          const stateRaw =
            params.get("state") ||
            new URLSearchParams(window.location.search).get("state");
          if (stateRaw) {
            const state = JSON.parse(
              atob(stateRaw.replace(/-/g, "+").replace(/_/g, "/"))
            ) as { next?: string };
            if (state.next?.startsWith("/")) nextPath = state.next;
          }
        } catch {
          /* ignore state parse */
        }

        if (error) {
          throw new Error(error.replace(/_/g, " "));
        }
        if (!idToken) {
          throw new Error(
            "No Google token returned. Try again and pick a Gmail account."
          );
        }

        setMessage("Creating your session…");
        const res = await fetch("/api/auth/oauth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign-in failed");

        const user = data.user as User;
        if (cancelled) return;
        setUser(user);
        localStorage.setItem("pyu_user", JSON.stringify(user));
        toast.success(`Welcome, ${user.fullName.split(" ")[0]}!`);

        // Clear hash so token is not left in history
        window.history.replaceState(null, "", "/auth/callback/google");

        if (user.role === "super_admin") router.replace("/super-admin");
        else if (
          user.role === "admin" ||
          user.role === "regional_admin" ||
          user.role === "district_admin"
        )
          router.replace("/admin");
        else router.replace(nextPath || "/dashboard");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Google sign-in failed";
        toast.error(msg);
        setMessage(msg);
        window.setTimeout(() => {
          router.replace(`/auth/login?google_error=${encodeURIComponent(msg)}`);
        }, 1500);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      <p className="text-sm text-muted-foreground text-center max-w-sm">{message}</p>
    </div>
  );
}
