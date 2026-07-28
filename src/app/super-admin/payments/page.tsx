"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  RefreshCw,
  Ticket,
  Heart,
  Wallet,
  Banknote,
  Smartphone,
  Loader2,
  ArrowDownToLine,
  Undo2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type DonationRow = {
  id: string;
  externalId?: string;
  amount: number;
  currency: string;
  status: string;
  donorName?: string;
  campaign?: string;
  purpose?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  phone?: string;
  liveCharge?: boolean;
  demoMode?: boolean;
  paidAt?: string;
  createdAt?: string;
};

type Summary = {
  totals: {
    donationRevenue: number;
    ticketRevenue: number;
    totalRevenue: number;
    completedDonations: number;
    pendingDonations: number;
    failedDonations: number;
    tickets: number;
    seats: number;
  };
  byMethod: Record<string, number>;
  ticketStats: {
    totalRevenue: number;
    totalSeats: number;
    totalTickets: number;
    byEvent: {
      eventId: string;
      eventTitle: string;
      seats: number;
      revenue: number;
      tickets: number;
    }[];
    recent: Array<{
      id: string;
      ticketCode: string;
      receiptId: string;
      eventTitle: string;
      userName: string;
      userEmail: string;
      seats: number;
      amountPaid: number;
      currency: string;
      paymentMethod: string;
      paidAt: string;
      status: string;
    }>;
  };
  recentDonations: DonationRow[];
};

type Balance = {
  currency: string;
  collected: number;
  fromDonations: number;
  fromTickets: number;
  withdrawn: number;
  reserved: number;
  available: number;
  completedCount: number;
  pendingCount: number;
};

type Withdrawal = {
  id: string;
  payoutId: string;
  amount: number;
  currency: string;
  gateway: "mtn_momo" | "airtel_money" | "unknown";
  phone: string;
  msisdn: string;
  status: string;
  providerStatus?: string;
  failureReason?: string;
  actorEmail?: string;
  actorName?: string;
  note?: string;
  method?: "payout" | "refund" | "manual";
  createdAt: string;
  completedAt?: string;
};

type RefundablePayment = {
  id: string;
  externalId?: string;
  amount: number;
  currency: string;
  donorName?: string;
  phone?: string;
  paymentMethod?: string;
  depositId: string;
  paidAt?: string;
  campaign?: string;
  purpose?: string;
};

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-emerald-600 text-white border-0">Paid</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-600 text-white border-0">Failed</Badge>;
  if (status === "processing" || status === "pending")
    return <Badge className="bg-amber-500 text-white border-0">Sending…</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function isValidUgPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (/^0[7][0-9]{8}$/.test(d)) return true;
  if (/^256[7][0-9]{8}$/.test(d)) return true;
  if (/^7[0-9]{8}$/.test(d)) return true;
  if (/^020[0-9]{7}$/.test(d)) return true;
  if (/^25620[0-9]{7}$/.test(d)) return true;
  return false;
}

export default function SuperAdminPaymentsPage() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    Array<{ country?: string; balance?: string; currency?: string; mno?: string }>
  >([]);
  const [pawaReady, setPawaReady] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    merchantName?: string;
    merchantId?: string;
    payoutsEnabled?: boolean;
    airtelPayout?: boolean;
    mtnPayout?: boolean;
    airtelDeposit?: boolean;
    mtnDeposit?: boolean;
    howToEnablePayouts?: string | null;
    correspondents?: Array<{
      correspondent: string;
      currency: string;
      operations: string[];
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [refundable, setRefundable] = useState<RefundablePayment[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const [gateway, setGateway] = useState<"airtel_money" | "mtn_momo">("airtel_money");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const actorQs = useCallback(() => {
    const q = new URLSearchParams();
    if (user?.id) q.set("actorId", user.id);
    if (user?.email) q.set("actorEmail", user.email);
    return q.toString();
  }, [user?.email, user?.id]);

  const load = useCallback(async () => {
    if (!user?.id && !user?.email) return;
    setLoading(true);
    try {
      const [sumRes, wRes, rRes] = await Promise.all([
        fetch("/api/payments/summary", { cache: "no-store" }),
        fetch(`/api/payments/withdraw?${actorQs()}`, { cache: "no-store" }),
        fetch(`/api/payments/refund?${actorQs()}`, { cache: "no-store" }),
      ]);
      const sumData = await sumRes.json();
      if (sumRes.ok) setSummary(sumData);

      const wData = await wRes.json();
      if (!wRes.ok) {
        if (wRes.status !== 403) {
          toast.error(wData.error || "Could not load withdraw balance");
        }
      } else {
        setBalance(wData.balance || null);
        setWithdrawals(wData.withdrawals || []);
        setWalletBalances(wData.wallet?.balances || []);
        setPawaReady(Boolean(wData.pawaPayReady));
        setCapabilities(wData.capabilities || null);
      }

      const rData = await rRes.json();
      if (rRes.ok) {
        setRefundable((rData.refundable || []) as RefundablePayment[]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [actorQs, user?.email, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const fillMax = () => {
    if (balance?.available) setAmount(String(Math.floor(balance.available)));
  };

  const submitWithdraw = async () => {
    if (!user) return;
    const amt = Math.round(Number(amount));
    if (!amt || amt < 500) {
      toast.error("Enter at least UGX 500");
      return;
    }
    if (balance && amt > balance.available) {
      toast.error(
        `Only UGX ${balance.available.toLocaleString()} is available to withdraw`
      );
      return;
    }
    if (!isValidUgPhone(phone)) {
      toast.error("Enter a valid UG mobile number (e.g. 0752 123 456)");
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user.id,
          actorEmail: user.email,
          amount: amt,
          phone: phone.trim(),
          gateway,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdraw failed");

      toast.success(data.message || "Withdrawal submitted");
      setAmount("");
      setNote("");
      setShowWithdraw(false);
      if (data.balance) setBalance(data.balance);
      if (data.withdrawal) {
        setWithdrawals((prev) => [data.withdrawal as Withdrawal, ...prev]);
      }
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const submitRefund = async (payment: RefundablePayment) => {
    if (!user) return;
    if (!payment.phone) {
      toast.error("This payment has no phone on file — cannot refund via mobile money");
      return;
    }
    const ok = window.confirm(
      `Refund UGX ${Number(payment.amount).toLocaleString()} to the ORIGINAL payer only?\n\n` +
        `Number that paid: ${payment.phone}\n` +
        `Donor: ${payment.donorName || "—"}\n\n` +
        `Money will NOT go to the super-admin wallet. It returns only to ${payment.phone}.`
    );
    if (!ok) return;

    setRefundingId(payment.id);
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user.id,
          actorEmail: user.email,
          paymentId: payment.id,
          depositId: payment.depositId,
          amount: payment.amount,
          note: `Refund to original payer ${payment.phone}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      toast.success(
        data.message ||
          `Refund sent to ${payment.phone} (the number that paid)`
      );
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundingId(null);
    }
  };

  const t = summary?.totals;
  const available = balance?.available ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Payments, refund &amp; withdraw
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track donations and tickets. Refund returns money only to the number that paid.
            Withdraw (when PAYOUT is enabled) sends to your own wallet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="outline"
            className="border-amber-500/50 text-amber-800 dark:text-amber-200"
            onClick={() => {
              document
                .getElementById("refund-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Undo2 className="h-4 w-4" /> Refund payments
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            onClick={() => setShowWithdraw((v) => !v)}
          >
            <Banknote className="h-4 w-4" />
            {showWithdraw ? "Close withdraw" : "Withdraw money"}
          </Button>
        </div>
      </div>

      {/* REFUND — only to original payer */}
      <div
        id="refund-section"
        className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Refund to original payer
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Uses PawaPay <strong className="text-foreground">REFUND</strong> (enabled on your
              account). Money always goes back to the <strong className="text-foreground">same
              mobile number that paid</strong> — never to a different wallet. Super admin only.
            </p>
          </div>
          <Badge className="bg-amber-600 text-white border-0 shrink-0">
            {refundable.length} refundable
          </Badge>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-background/80 p-3 text-xs text-muted-foreground flex gap-2">
          <Phone className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Example: donor paid with <span className="font-mono text-foreground">0752…</span> →
            refund lands on <span className="font-mono text-foreground">0752…</span> only. You
            cannot redirect a refund to your own number.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Paid by (phone)</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Network</th>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {refundable.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No refundable live payments yet. Completed PawaPay charges with a deposit ID
                    will appear here.
                  </td>
                </tr>
              )}
              {refundable.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.donorName || "Supporter"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {p.externalId || p.id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.campaign || p.purpose || "donation"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {p.phone || "—"}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                      Refund goes only here
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(p.paymentMethod || "—").replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/50 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10"
                      loading={refundingId === p.id}
                      disabled={!p.phone || refundingId !== null}
                      onClick={() => void submitRefund(p)}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Refund to {p.phone ? "payer" : "…"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available balance + withdraw */}
      <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Available to withdraw
            </p>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 mt-1">
              UGX {available.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xl">
              From completed donations and event ticket payments, minus money already withdrawn
              or still sending. Payouts use your PawaPay merchant wallet.
            </p>
            {balance && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span>
                  Collected:{" "}
                  <strong className="text-foreground">
                    UGX {balance.collected.toLocaleString()}
                  </strong>
                </span>
                <span>
                  Withdrawn:{" "}
                  <strong className="text-foreground">
                    UGX {balance.withdrawn.toLocaleString()}
                  </strong>
                </span>
                <span>
                  Reserved:{" "}
                  <strong className="text-foreground">
                    UGX {balance.reserved.toLocaleString()}
                  </strong>
                </span>
              </div>
            )}
            {walletBalances.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                PawaPay wallet:{" "}
                {walletBalances
                  .map(
                    (b) =>
                      `${b.currency || "UGX"} ${Number(b.balance || 0).toLocaleString()}${
                        b.mno ? ` (${b.mno})` : ""
                      }`
                  )
                  .join(" · ")}
              </p>
            )}
            {!pawaReady && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-2">
                Live withdraw needs PAWAPAY_API_TOKEN on the server (Render Environment).
              </p>
            )}
          </div>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0"
            disabled={available < 500 || capabilities?.payoutsEnabled === false}
            onClick={() => {
              setShowWithdraw(true);
              fillMax();
            }}
          >
            <ArrowDownToLine className="h-5 w-5" />
            Withdraw to mobile money
          </Button>
        </div>

        {/* PawaPay product capabilities — root cause of "no active flow" */}
        {capabilities && capabilities.payoutsEnabled === false && (
          <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Withdraw blocked: no PAYOUT on this PawaPay account
            </p>
            <p className="text-sm text-amber-950/90 dark:text-amber-100/90">
              Error like <code className="text-xs">no active flow configuration airtel_oapi_uga/uga/ugx</code>{" "}
              means your merchant can <strong>receive</strong> money (DEPOSIT) but cannot{" "}
              <strong>send</strong> to a phone (PAYOUT) yet.
            </p>
            {capabilities.merchantName && (
              <p className="text-xs text-muted-foreground">
                Merchant: <strong className="text-foreground">{capabilities.merchantName}</strong>
                {capabilities.merchantId ? ` · ${capabilities.merchantId}` : ""}
              </p>
            )}
            <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
              {(capabilities.correspondents || []).map((c) => (
                <li key={c.correspondent}>
                  <span className="font-mono text-foreground">{c.correspondent}</span>:{" "}
                  {(c.operations || []).join(", ") || "—"}
                  {!c.operations?.includes("PAYOUT") && (
                    <span className="text-amber-700 dark:text-amber-400"> (no PAYOUT)</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="text-sm space-y-1 pt-1">
              <p className="font-semibold text-foreground">How to fix (PawaPay, not the app):</p>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                <li>
                  Log in to the{" "}
                  <a
                    href="https://dashboard.pawapay.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline"
                  >
                    live PawaPay dashboard
                  </a>
                </li>
                <li>
                  Email <strong className="text-foreground">support@pawapay.io</strong> (or your
                  account manager)
                </li>
                <li>
                  Ask to enable <strong className="text-foreground">PAYOUT</strong> for Uganda:{" "}
                  <code className="text-[11px]">AIRTEL_OAPI_UGA</code> and{" "}
                  <code className="text-[11px]">MTN_MOMO_UGA</code>, currency UGX
                </li>
                <li>After they enable it, refresh this page — withdraw will unlock</li>
              </ol>
              {capabilities.howToEnablePayouts && (
                <p className="text-xs mt-2 text-muted-foreground">{capabilities.howToEnablePayouts}</p>
              )}
            </div>
          </div>
        )}

        {capabilities?.payoutsEnabled && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Payouts enabled
            {capabilities.airtelPayout ? " · Airtel" : ""}
            {capabilities.mtnPayout ? " · MTN" : ""}
          </p>
        )}

        {showWithdraw && (
          <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Send money to your wallet
            </h2>
            <p className="text-sm text-muted-foreground">
              Funds leave the PawaPay merchant balance and land on the number you enter (Airtel
              Money or MTN MoMo). Only super admins can withdraw.
            </p>

            {capabilities?.payoutsEnabled === false && (
              <p className="text-sm font-semibold text-red-600">
                Cannot send yet — enable PAYOUT on PawaPay first (see yellow box above).
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGateway("airtel_money")}
                disabled={capabilities?.airtelPayout === false}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  gateway === "airtel_money"
                    ? "border-[#ED1C24] bg-[#ED1C24]/10"
                    : "border-border/50 hover:border-border",
                  capabilities?.airtelPayout === false && "opacity-50 cursor-not-allowed"
                )}
              >
                <p className="font-bold text-[#ED1C24]">Airtel Money</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {capabilities?.airtelPayout === false
                    ? "PAYOUT not enabled on PawaPay"
                    : "Recommended"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setGateway("mtn_momo")}
                disabled={capabilities?.mtnPayout === false}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  gateway === "mtn_momo"
                    ? "border-[#FFCC00] bg-[#FFCC00]/15"
                    : "border-border/50 hover:border-border",
                  capabilities?.mtnPayout === false && "opacity-50 cursor-not-allowed"
                )}
              >
                <p className="font-bold text-[#004F71]">MTN MoMo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {capabilities?.mtnPayout === false
                    ? "PAYOUT not enabled on PawaPay"
                    : "MTN wallet"}
                </p>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label={
                  gateway === "airtel_money"
                    ? "Your Airtel Money number"
                    : "Your MTN MoMo number"
                }
                placeholder={gateway === "airtel_money" ? "0752 123 456" : "0772 123 456"}
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <div className="space-y-1.5">
                <Input
                  label="Amount (UGX)"
                  type="number"
                  min={500}
                  max={available || undefined}
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                  onClick={fillMax}
                >
                  Use full available (UGX {available.toLocaleString()})
                </button>
              </div>
            </div>

            <Input
              label="Note (optional)"
              placeholder="e.g. Weekly operations withdraw"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                className={cn(
                  "font-bold text-white flex-1",
                  gateway === "airtel_money"
                    ? "bg-[#ED1C24] hover:bg-[#c41620]"
                    : "bg-[#004F71] hover:bg-[#003555]"
                )}
                loading={withdrawing}
                disabled={
                  withdrawing ||
                  available < 500 ||
                  capabilities?.payoutsEnabled === false ||
                  (gateway === "airtel_money" && capabilities?.airtelPayout === false) ||
                  (gateway === "mtn_momo" && capabilities?.mtnPayout === false)
                }
                onClick={() => void submitWithdraw()}
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Withdraw UGX{" "}
                    {(Math.round(Number(amount)) || 0).toLocaleString() || "—"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowWithdraw(false)}
                disabled={withdrawing}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal / refund history */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 font-bold flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
          Withdraw &amp; refund history
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">To number</th>
                <th className="px-4 py-2">Network</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No withdraw or refund records yet
                  </td>
                </tr>
              )}
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-t border-border/40">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(w.completedAt || w.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {w.method === "refund" ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-500/40">
                        Refund → payer
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-500/40">
                        Withdraw
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {w.currency} {Number(w.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{w.phone || w.msisdn}</td>
                  <td className="px-4 py-3 text-xs">
                    {w.gateway === "airtel_money"
                      ? "Airtel Money"
                      : w.gateway === "mtn_momo"
                        ? "MTN MoMo"
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {statusBadge(w.status)}
                    {w.failureReason && (
                      <p className="text-[10px] text-red-600 mt-1 max-w-[180px]">
                        {w.failureReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {w.actorName || w.actorEmail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Total collected
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            UGX {(t?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> Donations
          </p>
          <p className="text-2xl font-black mt-1">
            UGX {(t?.donationRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t?.completedDonations || 0} paid · {t?.pendingDonations || 0} pending ·{" "}
            {t?.failedDonations || 0} failed
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Ticket className="h-3.5 w-3.5" /> Event tickets
          </p>
          <p className="text-2xl font-black mt-1">
            UGX {(t?.ticketRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t?.tickets || 0} tickets · {t?.seats || 0} seats
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Methods</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {summary?.byMethod && Object.keys(summary.byMethod).length > 0 ? (
              Object.entries(summary.byMethod).map(([method, amt]) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method.replace(/_/g, " ")}: {(amt as number).toLocaleString()}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No completed payments yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 font-bold flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#ED1C24]" /> Recent donations &amp; mobile money
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Ref</th>
                <th className="px-4 py-2">Donor</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Refund</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recentDonations || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No donations yet — try /donate with Airtel or MTN
                  </td>
                </tr>
              )}
              {(summary?.recentDonations || []).map((d) => {
                const canRefund = refundable.some((r) => r.id === d.id);
                const refundRow = refundable.find((r) => r.id === d.id);
                return (
                <tr key={d.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{d.externalId || d.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">{d.campaign || d.purpose}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.donorName || "—"}</p>
                    {d.phone && (
                      <p className="text-xs text-muted-foreground font-mono">{d.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {d.currency} {Number(d.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(d.paymentMethod || d.paymentProvider || "—").replace(/_/g, " ")}
                    {d.liveCharge && (
                      <span className="block text-[10px] text-emerald-600">Live charge</span>
                    )}
                    {d.demoMode && (
                      <span className="block text-[10px] text-amber-600">Demo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {d.paidAt || d.createdAt
                      ? new Date(d.paidAt || d.createdAt || "").toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {canRefund && refundRow ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-amber-700"
                        loading={refundingId === d.id}
                        disabled={refundingId !== null}
                        onClick={() => void submitRefund(refundRow)}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Refund
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(summary?.ticketStats?.byEvent || []).length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 font-bold">By event</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Tickets</th>
                  <th className="px-4 py-2">Seats</th>
                  <th className="px-4 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.ticketStats?.byEvent || []).map((e) => (
                  <tr key={e.eventId} className="border-t border-border/40">
                    <td className="px-4 py-3 font-medium">{e.eventTitle}</td>
                    <td className="px-4 py-3">{e.tickets}</td>
                    <td className="px-4 py-3">{e.seats}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">
                      UGX {e.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 font-bold flex items-center gap-2">
          <Ticket className="h-4 w-4" /> Recent tickets &amp; e-receipts
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Receipt</th>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Seats</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.ticketStats?.recent || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No confirmed event payments yet
                  </td>
                </tr>
              )}
              {(summary?.ticketStats?.recent || []).map((row) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${row.id}`}
                      className="font-mono text-xs text-emerald-600 hover:underline"
                    >
                      {row.receiptId}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {row.ticketCode}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.userName}</p>
                    <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">{row.eventTitle}</td>
                  <td className="px-4 py-3">{row.seats}</td>
                  <td className="px-4 py-3 font-semibold">
                    {row.currency} {row.amountPaid.toLocaleString()}
                    <p className="text-[10px] text-muted-foreground">
                      {row.paymentMethod.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(row.paidAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Refund:</strong> returns money to the{" "}
          <em>same phone that paid</em> (PawaPay REFUND — already enabled on your account).
        </p>
        <p>
          <strong className="text-foreground">Withdraw:</strong> sends merchant balance to{" "}
          <em>your</em> Airtel/MTN number (needs PAYOUT enabled by PawaPay support).
        </p>
        <p>
          Callback: https://patriotic-app.onrender.com/api/payments/pawapay/callback — paste for
          Deposits, Payouts, <strong>and Refunds</strong> in the PawaPay dashboard.
        </p>
      </div>
    </div>
  );
}
