"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  Home,
  Printer,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-cms";
import { cn } from "@/lib/utils";

export type ReceiptRow = { label: string; value: string };

export type OfficialReceiptProps = {
  kind?: "donation" | "payment" | "ticket" | "event" | "membership";
  /** Main heading under brand */
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  method?: string;
  reference: string;
  paidAt?: string;
  statusLabel?: string;
  rows?: ReceiptRow[];
  /** Highlight strip for events (date / venue / seats) */
  highlightRows?: ReceiptRow[];
  /** When set, shows QR block (tickets / events) */
  qrValue?: string;
  qrCaption?: string;
  /** Extra primary action (e.g. back to event) */
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

function formatPaidAt(iso?: string) {
  if (!iso) return new Date().toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" });
  try {
    return new Date(iso).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function kindAccent(kind: OfficialReceiptProps["kind"]) {
  switch (kind) {
    case "donation":
      return { badge: "Donation receipt", chip: "Thank you" };
    case "ticket":
    case "event":
      return { badge: "Event ticket · Official e-receipt", chip: "Entry pass" };
    case "membership":
      return { badge: "Membership payment", chip: "Member" };
    default:
      return { badge: "Payment receipt", chip: "Confirmed" };
  }
}

/**
 * Single-page official receipt — modern on-screen, compact A4 when printed.
 */
export function OfficialReceipt({
  kind = "payment",
  title,
  subtitle,
  amount,
  currency = "UGX",
  method,
  reference,
  paidAt,
  statusLabel = "Payment successful",
  rows = [],
  highlightRows = [],
  qrValue,
  qrCaption,
  secondaryHref,
  secondaryLabel,
  className,
}: OfficialReceiptProps) {
  const { data: site } = useSiteSettings();
  const accent = kindAccent(kind);
  const org = site?.orgName || "Patriotic Youths of Uganda";
  const support = site?.supportEmail || "info@pyu.ug";
  const hotline = site?.hotline || "+256 700 000 000";
  const address = site?.address || "Plot 1, Parliamentary Avenue, Kampala";

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `${title}\n${currency} ${Number(amount || 0).toLocaleString()}\nRef: ${reference}\n${org}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${org} Receipt`, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className={cn("receipt-page mx-auto w-full max-w-[210mm]", className)}>
      {/* Screen-only actions */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Official document · One page
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button type="button" size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-500">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Single printable sheet */}
      <article
        className={cn(
          "receipt-sheet relative overflow-hidden rounded-3xl border border-border/60 bg-card text-card-foreground shadow-2xl shadow-emerald-900/10",
          "print:rounded-none print:border print:border-zinc-300 print:shadow-none"
        )}
      >
        {/* Uganda flag stripe */}
        <div className="flag-stripe h-1.5 w-full print:h-2" aria-hidden />

        {/* Header band */}
        <div className="relative border-b border-border/50 bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 px-6 py-5 text-white sm:px-8 print:from-emerald-700 print:via-emerald-800 print:to-zinc-900">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 print:opacity-20"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(252,220,4,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(217,0,0,0.25), transparent 40%)",
            }}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo
                size="md"
                showText={false}
                variant="crest"
                className="!bg-white/10 ring-1 ring-white/20"
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  {accent.badge}
                </p>
                <p className="text-base font-black tracking-tight sm:text-lg">{org}</p>
                <p className="text-[11px] text-white/75">Unity · Service · Leadership · Development</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Status</p>
              <p className="flex items-center justify-end gap-1.5 text-sm font-bold text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                {statusLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-7 print:space-y-4 print:px-7 print:py-5">
          {/* Title + amount */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {accent.chip}
              </span>
              <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl print:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground leading-snug">{subtitle}</p>
              )}
            </div>
            {amount != null && Number.isFinite(amount) && (
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent px-5 py-3 text-right min-w-[9.5rem]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </p>
                <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-3xl print:text-2xl">
                  <span className="text-sm font-bold text-muted-foreground mr-1">{currency}</span>
                  {Number(amount).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Event / ticket highlight strip */}
          {highlightRows.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
              {highlightRows.map((r) => (
                <div
                  key={r.label + r.value}
                  className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-yellow-400/5 px-3.5 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold leading-snug">{r.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
            <MetaCell label="Paid / issued" value={formatPaidAt(paidAt)} />
            {method && <MetaCell label="Payment method" value={method} />}
            <MetaCell
              label="Document"
              value={
                kind === "ticket" || kind === "event"
                  ? "E-ticket + receipt"
                  : "Official receipt"
              }
            />
            {rows.map((r) => (
              <MetaCell key={r.label + r.value} label={r.label} value={r.value} />
            ))}
          </div>

          {/* Reference strip */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 print:bg-zinc-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction reference
                </p>
                <p className="mt-0.5 break-all font-mono text-xs font-semibold tracking-wide sm:text-sm">
                  {reference}
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            </div>
            {/* Decorative code bars for print authenticity */}
            <div
              className="mt-3 flex h-8 items-end gap-px overflow-hidden opacity-80 print:opacity-100"
              aria-hidden
            >
              {Array.from({ length: 48 }).map((_, i) => (
                <span
                  key={i}
                  className="bg-foreground/80"
                  style={{
                    width: i % 5 === 0 ? 2.5 : 1.2,
                    height: `${40 + ((i * 17) % 60)}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* QR for tickets — compact for one page */}
          {qrValue && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-white p-4 dark:bg-zinc-950 print:bg-white">
              <QRCodeSVG value={qrValue} size={132} level="H" includeMargin className="rounded-lg" />
              <p className="text-center text-[11px] font-medium text-muted-foreground">
                {qrCaption || "Scan at venue check-in"}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground break-all max-w-full text-center">
                {qrValue}
              </p>
            </div>
          )}

          {/* Footer identity */}
          <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold text-foreground/80">{org}</p>
              <p>{address}</p>
              <p>
                {support} · {hotline}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-medium text-foreground/70">Keep this document for your records</p>
              <p>Generated by PYU digital platform</p>
            </div>
          </div>
        </div>

        {/* Bottom flag stripe */}
        <div className="flag-stripe h-1 w-full print:h-1.5" aria-hidden />
      </article>

      {/* Screen-only nav */}
      <div className="no-print mt-6 flex flex-col sm:flex-row gap-2 justify-center">
        {secondaryHref && secondaryLabel && (
          <Link href={secondaryHref}>
            <Button variant="outline" className="w-full sm:w-auto min-w-[10rem]">
              {secondaryLabel}
            </Button>
          </Link>
        )}
        <Link href="/">
          <Button variant="ghost" className="w-full sm:w-auto min-w-[10rem]">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 print:bg-zinc-50 print:border-zinc-200">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug break-words">{value}</p>
    </div>
  );
}

export function gatewayLabel(g: string) {
  switch (g) {
    case "mtn_momo":
      return "MTN MoMo";
    case "airtel_money":
      return "Airtel Money";
    case "card":
      return "Card";
    case "bank":
      return "Bank transfer";
    default:
      return (g || "—").replace(/_/g, " ");
  }
}
