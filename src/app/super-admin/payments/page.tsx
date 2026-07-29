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

/** Normalize to 256… for display / PawaPay MSISDN preview */
function toUgMsisdnPreview(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = `256${d.slice(1)}`;
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("20"))) d = `256${d}`;
  if (d.startsWith("2560")) d = `256${d.slice(4)}`;
  return d;
}

const WITHDRAW_PHONE_KEY = "pyu_withdraw_recipient_phone";
const WITHDRAW_GATEWAY_KEY = "pyu_withdraw_gateway";

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
  /** Open by default so recipient field is obvious */
  const [showWithdraw, setShowWithdraw] = useState(true);
  const [refundable, setRefundable] = useState<RefundablePayment[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [manualRefundPhone, setManualRefundPhone] = useState("");
  const [manualRefundAmount, setManualRefundAmount] = useState("");
  const [manualRefundDepositId, setManualRefundDepositId] = useState("");
  const [manualRefundNote, setManualRefundNote] = useState("");
  const [manualFullRefund, setManualFullRefund] = useState(true);
  const [manualRefunding, setManualRefunding] = useState(false);
  const [phoneMatchTotal, setPhoneMatchTotal] = useState<number | null>(null);
  const [lookingUpPhone, setLookingUpPhone] = useState(false);

  const [gateway, setGateway] = useState<"airtel_money" | "mtn_momo">("airtel_money");
  /** Recipient MSISDN — whatever the super admin types (never hardcoded) */
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [skipBalanceCheck, setSkipBalanceCheck] = useState(false);

  // Restore last recipient number the admin chose (browser only — not a fixed server number)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WITHDRAW_PHONE_KEY);
      if (saved) setPhone(saved);
      const gw = localStorage.getItem(WITHDRAW_GATEWAY_KEY);
      if (gw === "mtn_momo" || gw === "airtel_money") setGateway(gw);
    } catch {
      /* ignore */
    }
  }, []);

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
    const recipient = phone.trim();
    if (!amt || amt < 500) {
      toast.error("Enter at least UGX 500");
      return;
    }
    if (!skipBalanceCheck && balance && amt > balance.available) {
      toast.error(
        `App ledger available is UGX ${balance.available.toLocaleString()}. Lower the amount or tick “PawaPay wallet has funds”.`
      );
      return;
    }
    if (!recipient) {
      toast.error("Type the mobile money number that should receive the money");
      return;
    }
    if (!isValidUgPhone(recipient)) {
      toast.error("Enter a valid UG number (07xx… or 2567…)");
      return;
    }

    const msisdn = toUgMsisdnPreview(recipient);
    const network = gateway === "airtel_money" ? "Airtel Money" : "MTN MoMo";
    const ok = window.confirm(
      `Send UGX ${amt.toLocaleString()} to this number?\n\n` +
        `Network: ${network}\n` +
        `You typed: ${recipient}\n` +
        `PawaPay will pay: ${msisdn}\n\n` +
        `Only this number receives the payout — change the field if it is wrong.`
    );
    if (!ok) return;

    setWithdrawing(true);
    try {
      try {
        localStorage.setItem(WITHDRAW_PHONE_KEY, recipient);
        localStorage.setItem(WITHDRAW_GATEWAY_KEY, gateway);
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user.id,
          actorEmail: user.email,
          amount: amt,
          /** Exact number super admin entered — not hardcoded */
          phone: recipient,
          gateway,
          note: note.trim() || `Withdraw to ${recipient}`,
          skipBalanceCheck,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdraw failed");

      const paidTo =
        data.pawaPay?.msisdn || data.withdrawal?.msisdn || msisdn;
      toast.success(
        data.message ||
          `Payout submitted to ${paidTo}`
      );
      setAmount("");
      setNote("");
      // Keep phone filled so admin can send again to the same chosen number
      if (data.balance) setBalance(data.balance);
      if (data.withdrawal) {
        setWithdrawals((prev) => [data.withdrawal as Withdrawal, ...prev]);
      }
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdraw failed", {
        duration: 8000,
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const lookupRefundPhone = async (rawPhone: string) => {
    if (!user || !rawPhone.trim()) {
      setPhoneMatchTotal(null);
      return;
    }
    setLookingUpPhone(true);
    try {
      const q = new URLSearchParams(actorQs());
      q.set("phone", rawPhone.trim());
      const res = await fetch(`/api/payments/refund?${q}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setPhoneMatchTotal(
          typeof data.matchTotal === "number" ? data.matchTotal : 0
        );
        if (Array.isArray(data.refundable)) {
          // Keep full list from main load; optional highlight via total
        }
      }
    } catch {
      setPhoneMatchTotal(null);
    } finally {
      setLookingUpPhone(false);
    }
  };

  const submitManualRefund = async () => {
    if (!user) return;
    const p = manualRefundPhone.trim();
    const depositId = manualRefundDepositId.trim();
    const amt = Math.round(Number(manualRefundAmount));
    const useFull = manualFullRefund || !amt;

    if (!depositId && !p) {
      toast.error("Enter the payer phone number and/or the PawaPay deposit ID");
      return;
    }
    if (p && !isValidUgPhone(p) && !depositId) {
      toast.error("Enter a valid UG number (e.g. 0752 123 456)");
      return;
    }
    if (!useFull && (!amt || amt < 1)) {
      toast.error("Enter a valid amount, or tick Full refund");
      return;
    }

    const ok = window.confirm(
      depositId
        ? `Send refund to PawaPay for deposit:\n${depositId}\n\n` +
            (useFull ? "Full refund of that deposit.\n" : `Amount: UGX ${amt.toLocaleString()}\n`) +
            `PawaPay decides if it is eligible. Money goes to the original payer of that deposit.`
        : `Send refund via PawaPay for phone ${p}?\n\n` +
            (useFull
              ? "We will refund the matching payment(s) fully (PawaPay decides eligibility).\n"
              : `Target amount: UGX ${amt.toLocaleString()}\n`) +
            `Money returns only to the number that paid each deposit.`
    );
    if (!ok) return;

    setManualRefunding(true);
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          actorId: user.id,
          actorEmail: user.email,
          phone: p || undefined,
          depositId: depositId || undefined,
          amount: useFull ? undefined : amt,
          fullRefund: useFull,
          note:
            manualRefundNote.trim() ||
            (depositId
              ? `Manual refund deposit ${depositId}`
              : `Manual refund to ${p}`),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      toast.success(data.message || "Refund submitted to PawaPay");
      setManualRefundAmount("");
      setManualRefundNote("");
      setManualRefundDepositId("");
      setPhoneMatchTotal(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed", {
        duration: 8000,
      });
    } finally {
      setManualRefunding(false);
    }
  };

  const submitRefund = async (payment: RefundablePayment) => {
    if (!user) return;
    if (!payment.phone) {
      toast.error("This payment has no phone on file — cannot refund via mobile money");
      return;
    }
    const ok = window.confirm(
      `Refund UGX ${Number(payment.amount).toLocaleString()} to ${payment.phone}?\n\n` +
        `Money returns only to the number that paid.`
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
          fullRefund: true,
          phone: payment.phone,
          note: `Refund to ${payment.phone}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      toast.success(
        data.message || `Refund sent to ${payment.phone}`
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

      {/* REFUND — manual by phone */}
      <div
        id="refund-section"
        className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Manual refund
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Type the <strong className="text-foreground">phone number</strong> that paid and the{" "}
              <strong className="text-foreground">amount</strong>. We match that number’s completed
              payments and send the refund back to it via PawaPay.
            </p>
          </div>
          <Badge className="bg-amber-600 text-white border-0 shrink-0">
            {refundable.length} refundable
          </Badge>
        </div>

        <div className="rounded-2xl border-2 border-amber-600/40 bg-background p-5 space-y-4 shadow-sm">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-amber-600" />
            Send refund to PawaPay
          </p>
          <p className="text-xs text-muted-foreground">
            We send your request to PawaPay. <strong className="text-foreground">They</strong> decide
            if the deposit is eligible (completed, not already refunded, etc.). Money always returns
            to the original payer of that deposit.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Phone that paid (optional if you paste deposit ID)"
              placeholder="0752 123 456"
              inputMode="tel"
              autoComplete="tel"
              value={manualRefundPhone}
              onChange={(e) => {
                setManualRefundPhone(e.target.value);
                setPhoneMatchTotal(null);
              }}
              onBlur={() => void lookupRefundPhone(manualRefundPhone)}
            />
            <div className="space-y-1.5">
              <Input
                label="Deposit ID from PawaPay / receipt (best)"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={manualRefundDepositId}
                onChange={(e) => setManualRefundDepositId(e.target.value.trim())}
              />
              <p className="text-[11px] text-muted-foreground">
                If app records are missing after a redeploy, paste deposit ID from{" "}
                <a
                  href="https://dashboard.pawapay.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-700 underline"
                >
                  PawaPay Deposits
                </a>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={manualFullRefund}
                onChange={(e) => setManualFullRefund(e.target.checked)}
                className="rounded border-border"
              />
              Full refund (recommended — let PawaPay refund the whole deposit)
            </label>
          </div>
          {!manualFullRefund && (
            <Input
              label="Partial amount (UGX) — only if not full refund"
              type="number"
              min={1}
              placeholder="e.g. 10000"
              value={manualRefundAmount}
              onChange={(e) => setManualRefundAmount(e.target.value)}
            />
          )}
          {lookingUpPhone && (
            <p className="text-[11px] text-muted-foreground">Looking up payments for this number…</p>
          )}
          {phoneMatchTotal != null && !lookingUpPhone && (
            <p className="text-[11px] text-muted-foreground">
              {phoneMatchTotal > 0 ? (
                <>
                  App records show ~UGX {phoneMatchTotal.toLocaleString()} for this number (PawaPay
                  still has the final say).
                </>
              ) : (
                <span className="text-amber-700">
                  No local match for this phone — paste the deposit ID from PawaPay dashboard and
                  submit anyway.
                </span>
              )}
            </p>
          )}
          <Input
            label="Note (optional)"
            placeholder="e.g. Self-test refund"
            value={manualRefundNote}
            onChange={(e) => setManualRefundNote(e.target.value)}
          />
          <Button
            size="lg"
            className="w-full sm:w-auto font-bold bg-amber-600 hover:bg-amber-500 text-white"
            loading={manualRefunding}
            disabled={manualRefunding}
            onClick={() => void submitManualRefund()}
          >
            <Undo2 className="h-4 w-4" />
            {manualFullRefund
              ? "Submit full refund to PawaPay"
              : `Refund UGX ${(Math.round(Number(manualRefundAmount)) || 0).toLocaleString()}`}
          </Button>
        </div>

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
          Or pick a payment from the list
        </p>

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
            disabled={available < 500 && !showWithdraw}
            onClick={() => {
              setShowWithdraw(true);
              fillMax();
            }}
          >
            <ArrowDownToLine className="h-5 w-5" />
            Withdraw to mobile money
          </Button>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">PawaPay POST /v2/payouts</p>
          <p>
            Matches PawaPay’s documented payload:{" "}
            <code className="text-[11px]">phoneNumber</code> = number you type,{" "}
            <code className="text-[11px]">provider</code> = AIRTEL_OAPI_UGA or MTN_MOMO_UGA.
            Wallet must have balance. Poll <code className="text-[11px]">GET /v2/payouts/{"{payoutId}"}</code>.
          </p>
          {capabilities && !capabilities.payoutsEnabled && (
            <p className="text-amber-700 dark:text-amber-400">
              If withdraw fails with PAYOUTS_NOT_ALLOWED, ask PawaPay to enable payouts on this
              merchant. Merchant: {capabilities.merchantName || "—"}.
            </p>
          )}
        </div>

        {showWithdraw && (
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-background p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Withdraw to any number you choose
            </h2>
            <p className="text-sm text-muted-foreground">
              Type the <strong className="text-foreground">exact mobile money number</strong> that
              should receive the money. Nothing is hard-coded — payout goes only to what you enter.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGateway("airtel_money")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  gateway === "airtel_money"
                    ? "border-[#ED1C24] bg-[#ED1C24]/10"
                    : "border-border/50 hover:border-border"
                )}
              >
                <p className="font-bold text-[#ED1C24]">Airtel Money</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recipient must be an Airtel number
                </p>
              </button>
              <button
                type="button"
                onClick={() => setGateway("mtn_momo")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  gateway === "mtn_momo"
                    ? "border-[#FFCC00] bg-[#FFCC00]/15"
                    : "border-border/50 hover:border-border"
                )}
              >
                <p className="font-bold text-[#004F71]">MTN MoMo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recipient must be an MTN number
                </p>
              </button>
            </div>

            <div className="rounded-xl border-2 border-emerald-600/40 bg-emerald-500/5 p-4 space-y-3">
              <Input
                label="Recipient phone (type any number you want)"
                placeholder="e.g. 07XX XXX XXX  — your number or another wallet"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {phone.trim() && (
                <div className="text-sm space-y-1">
                  {isValidUgPhone(phone) ? (
                    <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Money will be sent to:{" "}
                      <span className="font-mono">{phone.trim()}</span>
                      <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                        PawaPay MSISDN: {toUgMsisdnPreview(phone)} ·{" "}
                        {gateway === "airtel_money" ? "Airtel" : "MTN"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-amber-700 text-xs">
                      Enter a valid UG mobile number (07… or 256…)
                    </p>
                  )}
                </div>
              )}
              {!phone.trim() && (
                <p className="text-xs text-amber-700 font-medium">
                  No number entered yet — type the wallet that should receive this withdraw.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Input
                  label="Amount (UGX)"
                  type="number"
                  min={500}
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
              <Input
                label="Note (optional)"
                placeholder="e.g. Weekly operations to operations phone"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-border"
                checked={skipBalanceCheck}
                onChange={(e) => setSkipBalanceCheck(e.target.checked)}
              />
              <span>
                PawaPay merchant wallet already has funds (skip app ledger balance check). Use if
                donations cleared on free hosting but money is still in PawaPay.
              </span>
            </label>

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
                disabled={withdrawing || !phone.trim() || !amount.trim()}
                onClick={() => void submitWithdraw()}
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending to {phone.trim() || "…"}…
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Send UGX {(Math.round(Number(amount)) || 0).toLocaleString() || "—"} →{" "}
                    {phone.trim() || "type number first"}
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
