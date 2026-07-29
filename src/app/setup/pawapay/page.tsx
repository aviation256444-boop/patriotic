"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, AlertTriangle, Loader2, Lock } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

type SetupData = {
  ready: boolean;
  enabled: boolean;
  hasToken: boolean;
  env: string;
  baseUrl: string;
  appUrl: string;
  callbacks: {
    checkouts: string;
    deposits: string;
    payouts: string;
    refunds: string;
  };
  dashboard: {
    sandboxCallbacks: string;
    sandboxTokens: string;
    sandboxDeposits: string;
  };
  testNumbers: {
    mtnSuccess: string;
    airtelSuccess: string;
  };
  howToTest: string[];
};

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              toast.success("Copied");
            } catch {
              toast.error("Could not copy");
            }
          }}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      <code className="block text-sm break-all font-mono bg-muted/50 rounded-lg px-3 py-2">
        {value}
      </code>
    </div>
  );
}

function roleIsSuperAdmin(role: unknown): boolean {
  const r = String(role || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
  return r === "super_admin" || r === "superadmin";
}

/**
 * Internal PawaPay setup — not linked publicly.
 * Production: Super Admin only. Development: open for local wiring.
 */
export default function PawaPaySetupPage() {
  const router = useRouter();
  const { user, refreshUser, setUser, isSuperAdmin } = useAuthStore();
  const [gate, setGate] = useState<"checking" | "allowed" | "denied">("checking");
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const isProd = process.env.NODE_ENV === "production";
      if (!isProd) {
        if (!cancelled) setGate("allowed");
        return;
      }
      let session = useAuthStore.getState().user;
      if (!session && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("pyu_user");
          if (raw) {
            session = JSON.parse(raw);
            if (session) setUser(session);
          }
        } catch {
          /* ignore */
        }
      }
      const fresh = await refreshUser();
      const u = fresh || useAuthStore.getState().user;
      if (cancelled) return;
      if (u && (roleIsSuperAdmin(u.role) || useAuthStore.getState().isSuperAdmin())) {
        setGate("allowed");
      } else {
        setGate("denied");
        router.replace("/");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, router, setUser]);

  useEffect(() => {
    if (gate !== "allowed") return;
    let cancelled = false;
    void fetch("/api/payments/pawapay/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [gate]);

  if (gate === "checking") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">Verifying access…</p>
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          This setup page is only available to Super Admins.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHero
        badge="Internal · Super Admin"
        title="PawaPay callback & test setup"
        description="Internal tooling — not part of the public site. Copy these URLs into the PawaPay dashboard."
      />

      <section className="py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100 flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              Do not share this URL publicly. Prefer managing payments from Super Admin → Payments
              and Ops checklist.
              {user?.email ? ` Signed in as ${user.email}.` : null}
            </p>
          </div>

          {!data && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading setup…
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {data && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={data.ready ? "success" : "secondary"}>
                  {data.ready ? "Ready to charge" : "Not ready"}
                </Badge>
                <Badge variant={data.hasToken ? "success" : "destructive"}>
                  {data.hasToken ? "API token set" : "Missing API token"}
                </Badge>
                <Badge variant="info">{data.env}</Badge>
              </div>

              {!data.hasToken && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm space-y-2">
                    <p className="font-semibold">Add your PawaPay API token</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>
                        Open{" "}
                        <a
                          className="text-emerald-600 underline"
                          href={data.dashboard.sandboxTokens}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          API tokens
                        </a>
                      </li>
                      <li>Create a token and set PAWAPAY_API_TOKEN on your host (Render).</li>
                      <li>Redeploy, then refresh this page.</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Callback URLs
                </h2>
                <CopyRow label="App URL" value={data.appUrl} />
                <CopyRow label="Deposits / checkouts callback" value={data.callbacks.deposits} />
                <CopyRow label="Payouts callback" value={data.callbacks.payouts} />
                <CopyRow label="Refunds callback" value={data.callbacks.refunds} />
                <CopyRow label="API base" value={data.baseUrl} />
              </div>

              <div className="space-y-3">
                <h2 className="font-bold text-lg">Dashboard links</h2>
                <a
                  href={data.dashboard.sandboxCallbacks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                >
                  Callback URL settings <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={data.dashboard.sandboxTokens}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                >
                  API tokens <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={data.dashboard.sandboxDeposits}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                >
                  Deposits <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {data.testNumbers && (
                <div className="rounded-2xl border border-border/50 bg-card p-4 text-sm space-y-1">
                  <p className="font-semibold">Sandbox test numbers</p>
                  <p className="text-muted-foreground">MTN success: {data.testNumbers.mtnSuccess}</p>
                  <p className="text-muted-foreground">
                    Airtel success: {data.testNumbers.airtelSuccess}
                  </p>
                </div>
              )}

              {Array.isArray(data.howToTest) && data.howToTest.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-bold">How to test</h2>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    {data.howToTest.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {isSuperAdmin() && (
                <Button variant="outline" onClick={() => router.push("/super-admin/ops")}>
                  Open ops checklist
                </Button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
