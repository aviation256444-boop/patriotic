"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SquarePayments = {
  card: (opts?: object) => Promise<SquareCard>;
};

type SquareCard = {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message?: string }>;
  }>;
  destroy?: () => Promise<void> | void;
};

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

export type SquareCardFormProps = {
  amount: number;
  currency?: string;
  applicationId: string;
  locationId: string;
  env?: "sandbox" | "production";
  disabled?: boolean;
  className?: string;
  onToken: (sourceId: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

function loadSquareScript(env: "sandbox" | "production"): Promise<void> {
  const src =
    env === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  if (typeof window === "undefined") return Promise.resolve();
  if (window.Square) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.Square) resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Square SDK failed to load"))
        );
      }
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Square SDK failed to load"));
    document.head.appendChild(s);
  });
}

/**
 * Square Web Payments SDK card form.
 * Mount target stays in the DOM (never h-0) so attach() always finds it.
 */
export function SquareCardForm({
  amount,
  currency = "UGX",
  applicationId,
  locationId,
  env = "sandbox",
  disabled,
  className,
  onToken,
  onError,
}: SquareCardFormProps) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `sq-card-${reactId}`;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState("");

  const reportError = useCallback(
    (msg: string) => {
      setInitError(msg);
      onError?.(msg);
    },
    [onError]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setReady(false);
      setInitError("");

      if (!applicationId?.trim()) {
        reportError("Missing Square Application ID in .env.local");
        return;
      }
      if (!locationId?.trim()) {
        reportError(
          "Missing Location ID. In Square Console → Sandbox → Locations, copy the Location ID."
        );
        return;
      }

      try {
        await loadSquareScript(env);
        if (cancelled) return;
        if (!window.Square) {
          reportError("Square Web Payments SDK failed to load. Check your network.");
          return;
        }

        // Wait until the mount node is actually in the document
        let el = mountRef.current || document.getElementById(containerId);
        for (let i = 0; i < 20 && !el; i++) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          el = mountRef.current || document.getElementById(containerId);
        }
        if (!el) {
          reportError("Card form container not ready. Refresh the page and try again.");
          return;
        }

        // Clear previous iframe contents if re-init
        el.innerHTML = "";

        const payments = await window.Square.payments(applicationId, locationId);
        if (cancelled) return;

        const card = await payments.card({
          style: {
            input: { fontSize: "16px", color: "#111827" },
            "input::placeholder": { color: "#9ca3af" },
          },
        });
        if (cancelled) {
          await card.destroy?.();
          return;
        }

        // Prefer element ref — more reliable than CSS selector
        await card.attach(el as HTMLElement);
        if (cancelled) {
          await card.destroy?.();
          return;
        }

        cardRef.current = card;
        setReady(true);
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        // Friendlier message for the common attach race
        if (/not found|attach/i.test(raw)) {
          reportError(
            "Card form failed to mount. Refresh the page. If it continues, hard-refresh (Ctrl+F5)."
          );
        } else if (/application|location|unauthorized|forbidden/i.test(raw)) {
          reportError(
            `Square rejected the credentials: ${raw}. Check Application ID + Location ID match Sandbox mode.`
          );
        } else {
          reportError(raw || "Could not load Square card form");
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      const card = cardRef.current;
      cardRef.current = null;
      try {
        void card?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [applicationId, locationId, env, containerId, reportError]);

  const pay = async () => {
    if (!cardRef.current || loading || disabled) return;
    setLoading(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status === "OK" && result.token) {
        await onToken(result.token);
      } else {
        const msg =
          result.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
          "Card validation failed";
        onError?.(msg);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Tokenize failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-indigo-500/30 bg-card p-5 space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CreditCard className="h-4 w-4 text-indigo-600" />
        Pay with card (Square)
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Lock className="h-3 w-3" />
        Card details stay with Square — never touch our servers.
      </p>

      {/* Mount target ALWAYS in the DOM with real size so Square can attach */}
      <div
        ref={mountRef}
        id={containerId}
        className="min-h-[100px] rounded-xl border border-border/60 bg-background px-3 py-3"
      />

      {!ready && !initError && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center -mt-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading secure card form…
        </div>
      )}

      {initError && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-900 dark:text-amber-100 space-y-2">
          <p className="font-medium">{initError}</p>
          <p className="text-xs opacity-90">
            Credentials are set in <code className="bg-muted px-1 rounded">.env.local</code> if you
            already pasted them. Restart <code className="bg-muted px-1 rounded">npm run dev</code>{" "}
            after any env change.
          </p>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full bg-indigo-600 hover:bg-indigo-500"
        loading={loading}
        disabled={!ready || disabled || Boolean(initError)}
        onClick={() => void pay()}
      >
        Pay {currency} {amount.toLocaleString()} with card
      </Button>

      {env === "sandbox" && (
        <p className="text-[11px] text-muted-foreground text-center">
          Sandbox test card: <code className="bg-muted px-1 rounded">4111 1111 1111 1111</code> · any
          future expiry · any CVC · ZIP 12345
        </p>
      )}
    </div>
  );
}
