"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

export default function PawaPaySetupPage() {
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  return (
    <>
      <PageHero
        badge="Setup · PawaPay"
        title="PawaPay callback & test setup"
        description="Copy these exact URLs into the PawaPay Sandbox dashboard so deposits work and show on their website."
      />

      <section className="py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
          {!data && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading setup…
            </div>
          )}
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

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
                          rel="noreferrer"
                        >
                          API tokens
                        </a>
                      </li>
                      <li>Generate token → copy it immediately</li>
                      <li>
                        Put in <code className="bg-muted px-1 rounded">.env.local</code>:{" "}
                        <code className="bg-muted px-1 rounded">PAWAPAY_API_TOKEN=…</code>
                      </li>
                      <li>Restart <code className="bg-muted px-1 rounded">npm run dev</code></li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="font-bold text-lg">1. Paste these into PawaPay Callback URLs</h2>
                <p className="text-sm text-muted-foreground">
                  Open{" "}
                  <a
                    href={data.dashboard.sandboxCallbacks}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 underline inline-flex items-center gap-1"
                  >
                    Callback URLs <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  . Use the <strong>same URL</strong> for every field. Do{" "}
                  <strong>not</strong> tick “I do not wish to receive callbacks” if you want
                  callbacks.
                </p>
                <p className="text-xs rounded-lg bg-muted/50 p-2">
                  App public URL: <code className="font-mono">{data.appUrl}</code>
                  {data.appUrl.includes("localhost") && (
                    <span className="block mt-1 text-amber-700 dark:text-amber-300">
                      localhost cannot receive callbacks. Start Cloudflare Tunnel so
                      NEXT_PUBLIC_APP_URL is https://….trycloudflare.com then refresh this page.
                    </span>
                  )}
                </p>
                <CopyRow label="Checkouts" value={data.callbacks.checkouts} />
                <CopyRow label="Deposits (required for donations)" value={data.callbacks.deposits} />
                <CopyRow label="Payouts" value={data.callbacks.payouts} />
                <CopyRow label="Refunds" value={data.callbacks.refunds} />
              </div>

              <div className="space-y-2 rounded-2xl border border-border/50 p-5">
                <h2 className="font-bold text-lg">2. Test payment</h2>
                <ul className="text-sm space-y-1.5 text-muted-foreground">
                  <li>
                    MTN success number:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">
                      {data.testNumbers.mtnSuccess}
                    </code>
                  </li>
                  <li>
                    Airtel success number:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">
                      {data.testNumbers.airtelSuccess}
                    </code>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href="/donate">
                    <Button type="button">Open donate page →</Button>
                  </a>
                  <a
                    href={data.dashboard.sandboxDeposits}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button type="button" variant="outline">
                      PawaPay deposits <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Checklist
                </div>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  {data.howToTest.map((step) => (
                    <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
