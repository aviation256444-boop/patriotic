"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Building2,
  Smartphone,
  Loader2,
  Shield,
  Lock,
  Delete,
  Phone,
  KeyRound,
  SmartphoneNfc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MomoPayWidget, type MomoInvoiceDetail } from "@/components/payments/momo-pay-widget";
import { SquareCardForm } from "@/components/payments/square-card-form";
import type { PaymentGateway, PaymentPurpose } from "@/lib/payments/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PaymentReceipt = {
  paymentId: string;
  externalId: string;
  amount: number;
  currency: string;
  gateway: string;
  purpose?: string;
  campaign?: string;
  phone?: string;
  paidAt?: string;
};

export const PAYMENT_RECEIPT_KEY = "pyu_payment_receipt";

export type CheckoutProps = {
  amount: number;
  currency?: string;
  purpose?: PaymentPurpose;
  campaign?: string;
  donorName?: string;
  email?: string;
  message?: string;
  isAnonymous?: boolean;
  meta?: Record<string, unknown>;
  /**
   * After payment is fully confirmed, redirect here.
   * Default: /donate/success for donations, /payments/success otherwise.
   * Payment must succeed first — never redirects early.
   */
  successRedirect?: string;
  /**
   * When true, do not router.push after payment — parent handles navigation
   * (e.g. event ticket issue → /tickets/[id]).
   */
  disableAutoRedirect?: boolean;
  onSuccess?: (receipt: PaymentReceipt) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
};

const GATEWAYS: {
  id: PaymentGateway;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  featured?: boolean;
}[] = [
  {
    id: "airtel_money",
    name: "Airtel Money",
    desc: "PawaPay charges your Airtel wallet · PIN prompt on your phone",
    icon: Smartphone,
    color: "border-[#ED1C24] bg-[#ED1C24]/15",
    badge: "Recommended · PawaPay",
    featured: true,
  },
  {
    id: "mtn_momo",
    name: "MTN MoMo",
    desc: "PawaPay charges your MTN wallet · PIN prompt on your phone",
    icon: Smartphone,
    color: "border-[#FFCC00] bg-[#FFCC00]/10",
    badge: "PawaPay",
  },
  {
    id: "card",
    name: "Visa / Mastercard",
    desc: "Pay with card via Square (alternative)",
    icon: CreditCard,
    color: "border-indigo-500/40 bg-indigo-500/10",
    badge: "Card",
  },
  {
    id: "bank",
    name: "Bank transfer",
    desc: "Manual transfer · admin confirms later",
    icon: Building2,
    color: "border-emerald-500/40 bg-emerald-500/10",
    badge: "Bank",
  },
];

type Phase =
  | "select"
  | "phone"
  | "awaiting"
  | "pin"
  | "details"
  | "processing"
  | "success"
  | "failed";

function formatUgPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("256") && d.length >= 12) {
    return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9, 12)}`;
  }
  if (d.startsWith("0") && d.length >= 10) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}`;
  }
  return raw;
}

/** Uganda mobile: 07xxxxxxxx / 2567xxxxxxxx / 7xxxxxxxx (MTN + Airtel) */
function isValidUgMomoPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (/^0[7][0-9]{8}$/.test(d)) return true;
  if (/^256[7][0-9]{8}$/.test(d)) return true;
  if (/^7[0-9]{8}$/.test(d)) return true;
  // Airtel also uses 020… in some ranges
  if (/^020[0-9]{7}$/.test(d)) return true;
  if (/^25620[0-9]{7}$/.test(d)) return true;
  return false;
}

const POLL_MS = 3000;
/** ~5 minutes — mobile money PIN prompts can take a while */
const MAX_POLLS = 100;

export function PaymentCheckout({
  amount,
  currency = "UGX",
  purpose = "donation",
  campaign = "general",
  donorName = "",
  email = "",
  message = "",
  isAnonymous = false,
  meta,
  successRedirect,
  disableAutoRedirect = false,
  onSuccess,
  onCancel,
  className,
}: CheckoutProps) {
  const router = useRouter();
  /** Default: Airtel Money via PawaPay — direct phone PIN charge */
  const [gateway, setGateway] = useState<PaymentGateway>("airtel_money");
  const [phase, setPhase] = useState<Phase>("select");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [card, setCard] = useState({
    number: "4242 4242 4242 4242",
    exp: "12/30",
    cvc: "123",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const [awaitMsg, setAwaitMsg] = useState("");
  const [failReason, setFailReason] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [session, setSession] = useState<{
    paymentId: string;
    externalId: string;
    providerRef?: string;
    /** pawapay | momo | airtel | square | bank | demo */
    provider?: string;
    demoMode?: boolean;
    liveCharge?: boolean;
    message?: string;
    msisdn?: string;
    instructions?: {
      title: string;
      steps: string[];
      brandColor: string;
      brandBg: string;
    };
  } | null>(null);
  /** MTN QR widget off by default — prefer PawaPay phone charge */
  const [useWidget, setUseWidget] = useState(false);
  const [squareCfg, setSquareCfg] = useState<{
    enabled: boolean;
    env: "sandbox" | "production";
    applicationId: string;
    locationId: string;
    webPaymentsReady: boolean;
    chargeReady: boolean;
  } | null>(null);
  const [pawaReady, setPawaReady] = useState<boolean | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/payments/square/config")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSquareCfg(d);
      })
      .catch(() => {
        if (!cancelled) setSquareCfg(null);
      });
    void fetch("/api/payments/pawapay/config")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPawaReady(Boolean(d.ready && d.hasToken));
      })
      .catch(() => {
        if (!cancelled) setPawaReady(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const redirectPath =
    successRedirect ||
    (purpose === "donation" ? "/donate/success" : "/payments/success");

  const isMobileMoney = gateway === "mtn_momo" || gateway === "airtel_money";
  const brand = useMemo(() => {
    if (gateway === "airtel_money") {
      return { bg: "#ED1C24", accent: "#fff", name: "Airtel Money" };
    }
    return { bg: "#004F71", accent: "#FFCC00", name: "MTN MoMo" };
  }, [gateway]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (phase !== "processing" && !redirecting) return;
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 92));
    }, 200);
    return () => clearInterval(t);
  }, [phase, redirecting]);

  /**
   * Only called after payment is fully confirmed (MTN SUCCESSFUL or demo confirm).
   * Then redirects to the success page — never before payment completes.
   */
  const markSuccess = useCallback(
    (s: NonNullable<typeof session>) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stopPolling();
      setProgress(100);

      const receipt: PaymentReceipt = {
        paymentId: s.paymentId,
        externalId: s.externalId,
        amount,
        currency,
        gateway,
        purpose,
        campaign,
        phone: phone || s.msisdn || "",
        paidAt: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem(PAYMENT_RECEIPT_KEY, JSON.stringify(receipt));
      } catch {
        /* ignore private mode */
      }

      setRedirecting(true);
      setPhase("processing");
      toast.success("Payment confirmed!", {
        description: disableAutoRedirect
          ? "Issuing your ticket…"
          : "Redirecting to your receipt…",
      });

      void (async () => {
        try {
          // Await parent (event ticket issue) so we don't navigate away early
          await onSuccess?.(receipt);
        } catch (e) {
          console.error(e);
          toast.error(
            e instanceof Error ? e.message : "Could not finish after payment"
          );
        }

        if (disableAutoRedirect) {
          // Parent navigates (e.g. to /tickets/[id])
          return;
        }

        const params = new URLSearchParams({
          ref: receipt.externalId,
          paymentId: receipt.paymentId,
          amount: String(receipt.amount),
          currency: receipt.currency,
          gateway: receipt.gateway,
          purpose: purpose || "donation",
        });
        if (campaign) params.set("campaign", campaign);
        if (receipt.phone) params.set("phone", receipt.phone);

        window.setTimeout(() => {
          router.push(`${redirectPath}?${params.toString()}`);
        }, 500);
      })();
    },
    [
      amount,
      campaign,
      currency,
      disableAutoRedirect,
      gateway,
      onSuccess,
      phone,
      purpose,
      redirectPath,
      router,
      stopPolling,
    ]
  );

  const pollLiveStatus = useCallback(
    async (s: NonNullable<typeof session>, gw: PaymentGateway) => {
      try {
        const q = new URLSearchParams({
          paymentId: s.paymentId,
          referenceId: s.providerRef || "",
          transactionId: s.providerRef || "",
          depositId: s.providerRef || s.paymentId,
          externalId: s.externalId,
        });
        const viaPawaPay = s.provider === "pawapay";
        const path = viaPawaPay
          ? `/api/payments/pawapay/status?${q}`
          : gw === "airtel_money"
            ? `/api/payments/airtel/status?${q}`
            : `/api/payments/momo/status?${q}`;
        const res = await fetch(path, { cache: "no-store" });
        const data = await res.json();
        const brandName = viaPawaPay
          ? gw === "airtel_money"
            ? "Airtel Money (PawaPay)"
            : "MTN MoMo (PawaPay)"
          : gw === "airtel_money"
            ? "Airtel Money"
            : "MTN MoMo";
        if (!res.ok) {
          setAwaitMsg(data.error || `Checking with ${brandName}…`);
          return;
        }

        if (data.status === "SUCCESSFUL" || data.donationStatus === "completed") {
          markSuccess(s);
          return;
        }
        if (data.status === "FAILED" || data.donationStatus === "failed") {
          finishedRef.current = true;
          stopPolling();
          setFailReason(data.reason || data.error || `Payment declined on ${brandName}`);
          setPhase("failed");
          toast.error(`Payment failed on ${brandName}`);
          return;
        }

        setAwaitMsg(
          data.message ||
            `Waiting for you to enter your ${brandName} PIN on your phone…`
        );
      } catch {
        setAwaitMsg(
          gateway === "airtel_money"
            ? "Network issue — still waiting for Airtel…"
            : "Network issue — still waiting for MTN…"
        );
      }
    },
    [gateway, markSuccess, stopPolling]
  );

  const startLivePolling = useCallback(
    (s: NonNullable<typeof session>, gw: PaymentGateway = gateway) => {
      finishedRef.current = false;
      setPollCount(0);
      setPhase("awaiting");
      setAwaitMsg(
        gw === "airtel_money"
          ? "PawaPay sent the charge. Check your phone for the Airtel Money PIN prompt…"
          : "PawaPay sent the charge. Check your phone for the MTN MoMo PIN prompt…"
      );
      void pollLiveStatus(s, gw);

      stopPolling();
      let n = 0;
      pollTimer.current = setInterval(() => {
        n += 1;
        setPollCount(n);
        if (n >= MAX_POLLS) {
          stopPolling();
          setAwaitMsg(
            "Still waiting after several minutes. If you already approved on the phone, tap “I approved — check again”. If the prompt never appeared, cancel and try again with the correct number."
          );
          return;
        }
        void pollLiveStatus(s, gw);
      }, POLL_MS);
    },
    [gateway, pollLiveStatus, stopPolling]
  );

  const goNextFromSelect = () => {
    if (isMobileMoney && !useWidget) {
      setPhase("phone");
      return;
    }
    void startCheckout();
  };

  const startCheckout = async () => {
    if (amount < 500) {
      toast.error("Amount too low");
      return;
    }

    const phoneToUse = phone.trim();

    if (isMobileMoney && !useWidget) {
      if (!phoneToUse) {
        toast.error("Enter your mobile money number");
        return;
      }
      if (!isValidUgMomoPhone(phoneToUse)) {
        toast.error("Enter a valid UG MoMo number (e.g. 0772 123 456)");
        return;
      }
    }

    setLoading(true);
    finishedRef.current = false;
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          gateway,
          purpose,
          campaign,
          donorName,
          email,
          phone: phoneToUse || undefined,
          message,
          isAnonymous,
          meta,
          requirePhone: isMobileMoney && !useWidget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      const nextSession = {
        paymentId: data.paymentId as string,
        externalId: data.externalId as string,
        providerRef: data.providerRef as string | undefined,
        provider: (data.provider as string | undefined) || undefined,
        demoMode: Boolean(data.demoMode),
        liveCharge: Boolean(data.liveCharge),
        message: data.message as string | undefined,
        msisdn: data.msisdn as string | undefined,
        instructions: data.instructions as {
          title: string;
          steps: string[];
          brandColor: string;
          brandBg: string;
        },
      };
      setSession(nextSession);
      setPin("");

      if (
        (gateway === "mtn_momo" || gateway === "airtel_money") &&
        !useWidget &&
        nextSession.liveCharge
      ) {
        // Live: PawaPay / MTN / Airtel → donor PIN on phone → we poll → success
        const brand =
          gateway === "airtel_money" ? "Airtel Money" : "MTN MoMo";
        toast.success(`Charge sent to your ${brand} phone`, {
          description: `Approve ${currency} ${amount.toLocaleString()} with your PIN on the handset`,
        });
        startLivePolling(nextSession, gateway);
      } else if (isMobileMoney && !useWidget) {
        // Demo / no live keys: in-app PIN
        setPhase("pin");
        toast.message(data.message || "Enter PIN to complete test payment");
      } else {
        setPhase("details");
        toast.success("Payment session created", {
          description: data.message || "Complete the steps below",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setLoading(false);
    }
  };

  const appendPinDigit = (d: string) => {
    setPin((p) => (p.length >= 5 ? p : p + d));
  };

  const clearPinDigit = () => {
    setPin((p) => p.slice(0, -1));
  };

  const completePayment = async (status: "completed" | "failed" | "pending" = "completed") => {
    if (!session) return;

    if (status === "completed") {
      if (isMobileMoney && !useWidget && !session.liveCharge) {
        if (pin.length < 4 || !/^\d{4,5}$/.test(pin)) {
          toast.error("Enter your 4-digit MoMo PIN");
          return;
        }
      }
      if (gateway === "card") {
        const num = card.number.replace(/\s/g, "");
        if (num.length < 12) {
          toast.error("Enter a valid card number");
          return;
        }
      }
    }

    // Live MTN / Airtel: poll provider — never force complete client-side
    if (session.liveCharge && status === "completed") {
      setPhase("processing");
      try {
        const res = await fetch("/api/payments/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: session.paymentId,
            externalId: session.externalId,
            gateway,
            providerRef: session.providerRef,
            poll: true,
          }),
        });
        const data = await res.json();
        if (data.status === "completed") {
          markSuccess(session);
          return;
        }
        if (data.status === "failed") {
          setFailReason(data.reason || data.error || "Failed");
          setPhase("failed");
          return;
        }
        startLivePolling(session, gateway);
      } catch {
        startLivePolling(session, gateway);
      }
      return;
    }

    setPhase("processing");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const res = await fetch("/api/payments/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: session.paymentId,
          externalId: session.externalId,
          gateway,
          status,
          providerRef: session.providerRef,
          pin,
          requirePin: isMobileMoney && !useWidget && !session.liveCharge,
          cardNumber: card.number,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirmation failed");

      setProgress(100);
      if (data.status === "completed") {
        markSuccess(session);
      } else if (data.status === "failed") {
        setPhase("failed");
        toast.error("Payment failed");
      } else {
        setPhase("pin");
        toast.message("Payment still pending");
      }
    } catch (e) {
      setPhase("failed");
      toast.error(e instanceof Error ? e.message : "Payment error");
    } finally {
      setLoading(false);
    }
  };

  const chargeWithSquare = async (sourceId: string) => {
    if (!session) return;
    setPhase("processing");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/square/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: session.paymentId,
          externalId: session.externalId,
          sourceId,
          amount,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Card payment failed");
      if (data.status === "completed") {
        markSuccess({
          ...session,
          providerRef: data.squarePaymentId || session.providerRef,
        });
      } else {
        setPhase("details");
        toast.message("Payment pending — check again shortly");
      }
    } catch (e) {
      setFailReason(e instanceof Error ? e.message : "Card payment failed");
      setPhase("failed");
      toast.error(e instanceof Error ? e.message : "Card payment failed");
    } finally {
      setLoading(false);
    }
  };

  const onWidgetSuccess = async (detail: MomoInvoiceDetail) => {
    if (!session) return;
    setPhase("processing");
    await fetch("/api/payments/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: session.paymentId,
        externalId: session.externalId,
        gateway: "mtn_momo",
        status: "completed",
        providerRef: detail.referenceId || detail.paymentReference,
        meta: detail,
      }),
    });
    setProgress(100);
    markSuccess({ ...session, providerRef: detail.referenceId || session.providerRef });
  };

  // Full success UI lives on the success page — checkout only redirects after payment.
  if (phase === "success" || redirecting) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4",
          className
        )}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h3 className="text-xl font-bold">Payment confirmed</h3>
        <p className="text-muted-foreground text-sm">
          {currency} {amount.toLocaleString()} paid successfully
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Taking you to your receipt…
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 transition-all duration-200"
            style={{ width: `${Math.max(progress, 88)}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-4",
          className
        )}
      >
        <h3 className="text-xl font-bold text-red-600">Payment failed</h3>
        <p className="text-sm text-muted-foreground">
          {failReason || "Please try again or use another number."}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              stopPolling();
              setPin("");
              setFailReason("");
              setPhase(isMobileMoney && !useWidget ? "phone" : "select");
            }}
          >
            Try again
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/50 bg-card p-8 text-center space-y-4",
          className
        )}
      >
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
        <h3 className="font-bold">
          {redirecting ? "Payment confirmed — redirecting…" : "Confirming payment…"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {redirecting
            ? "Do not close this window"
            : `Verifying ${currency} ${amount.toLocaleString()} charge`}
        </p>
        <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div
        className={cn(
          "rounded-2xl text-white p-5 flex flex-wrap items-center justify-between gap-3",
          gateway === "airtel_money"
            ? "bg-gradient-to-r from-[#ED1C24] to-[#9b0f16]"
            : gateway === "mtn_momo"
              ? "bg-gradient-to-r from-[#004F71] to-emerald-800"
              : "bg-gradient-to-r from-emerald-800 to-[#004F71]"
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-white/70 flex items-center gap-1.5">
            <SmartphoneNfc className="h-3.5 w-3.5" />
            {isMobileMoney
              ? gateway === "airtel_money"
                ? "Airtel Money · charged on your phone"
                : "MTN MoMo · charged on your phone"
              : "Amount due"}
          </p>
          <p className="text-3xl font-black">
            {currency} {amount.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-white/90">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-semibold">
            <Lock className="h-3.5 w-3.5" />
            Powered by PawaPay
          </span>
          {isMobileMoney && (
            <span className="text-white/70">Enter PIN on phone to confirm</span>
          )}
        </div>
      </div>

      {isMobileMoney &&
        !useWidget &&
        (phase === "select" || phase === "phone" || phase === "awaiting" || phase === "pin") && (
          <ol className="flex items-center gap-2 text-xs sm:text-sm">
            {[
              { id: "select", label: "Network" },
              { id: "phone", label: "Your number" },
              { id: "awaiting", label: "PIN on phone" },
            ].map((s, i) => {
              const order = ["select", "phone", "awaiting"] as const;
              const mapped =
                phase === "pin" ? "awaiting" : (phase as (typeof order)[number] | "details");
              const current = order.indexOf(
                mapped === "awaiting" || mapped === "select" || mapped === "phone"
                  ? mapped
                  : "select"
              );
              const mine = i;
              const done = current > mine;
              const active = current === mine;
              const activeRing =
                gateway === "airtel_money"
                  ? "bg-[#ED1C24] text-white ring-2 ring-[#ED1C24]/40"
                  : "bg-[#004F71] text-white ring-2 ring-[#FFCC00]";
              return (
                <li key={s.id} className="flex items-center gap-2 flex-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                      done && "bg-emerald-500 text-white",
                      active && activeRing,
                      !done && !active && "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "font-medium truncate",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  {i < 2 && <span className="hidden sm:block flex-1 h-px bg-border ml-1" />}
                </li>
              );
            })}
          </ol>
        )}

      {phase === "select" && (
        <>
          <div className="rounded-2xl border border-[#ED1C24]/30 bg-[#ED1C24]/5 p-4 flex gap-3">
            <Shield className="h-5 w-5 text-[#ED1C24] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Pay from your phone with PawaPay</p>
              <p className="text-muted-foreground mt-0.5">
                Choose <strong className="text-[#ED1C24]">Airtel Money</strong> (recommended) or
                MTN MoMo. We send a charge request to your number — approve with your PIN on the
                phone. No card details needed.
              </p>
              {pawaReady === true && (
                <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Live mobile money is ready on this server.
                </p>
              )}
              {pawaReady === false && (
                <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Live PawaPay is not fully configured yet. Mobile money may fail until the API
                  token is set on the server.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Choose how to pay</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {GATEWAYS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGateway(g.id);
                    setUseWidget(false);
                  }}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all relative",
                    gateway === g.id
                      ? g.color + " border-2 shadow-md scale-[1.02]"
                      : "border-border/50 hover:border-border",
                    g.featured && gateway !== g.id && "ring-1 ring-[#ED1C24]/20"
                  )}
                >
                  {g.featured && (
                    <span className="absolute -top-2 right-3 rounded-full bg-[#ED1C24] text-white text-[10px] font-bold px-2 py-0.5">
                      Best for phone
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <g.icon
                      className={cn(
                        "h-6 w-6 shrink-0",
                        g.id === "airtel_money" && "text-[#ED1C24]"
                      )}
                    />
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        g.id === "airtel_money" &&
                          "bg-[#ED1C24]/15 text-[#ED1C24] border-0"
                      )}
                    >
                      {g.badge}
                    </Badge>
                  </div>
                  <p className="font-bold mt-2">{g.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className={cn(
              "w-full text-white font-bold",
              gateway === "airtel_money" && "bg-[#ED1C24] hover:bg-[#c41620]",
              gateway === "mtn_momo" && "bg-[#004F71] hover:bg-[#003555]",
              !isMobileMoney && "bg-emerald-600 hover:bg-emerald-500"
            )}
            loading={loading}
            onClick={goNextFromSelect}
          >
            {gateway === "airtel_money"
              ? `Pay with Airtel Money · ${currency} ${amount.toLocaleString()}`
              : gateway === "mtn_momo"
                ? `Pay with MTN MoMo · ${currency} ${amount.toLocaleString()}`
                : `Continue to pay ${currency} ${amount.toLocaleString()}`}
          </Button>
          {isMobileMoney && (
            <p className="text-center text-xs text-muted-foreground">
              Next: enter your {gateway === "airtel_money" ? "Airtel" : "MTN"} number → PIN prompt
              on that phone
            </p>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </>
      )}

      {phase === "phone" && isMobileMoney && (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5 text-white"
            style={{
              background:
                gateway === "airtel_money"
                  ? "linear-gradient(135deg, #ED1C24, #7f0e14)"
                  : `linear-gradient(135deg, ${brand.bg}, ${brand.bg}dd)`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
                <Phone className="h-4 w-4" />
                {brand.name} · PawaPay
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                Direct phone charge
              </Badge>
            </div>
            <p className="text-2xl font-black mt-2">
              {currency} {amount.toLocaleString()}
            </p>
            <p className="text-sm text-white/90 mt-2">
              {gateway === "airtel_money"
                ? "Enter your Airtel Money number. PawaPay will push a payment request to that phone — approve with your Airtel Money PIN."
                : "Enter your MTN MoMo number. PawaPay will push a payment request to that phone — approve with your MoMo PIN."}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border-2 bg-card p-5 space-y-4",
              gateway === "airtel_money" ? "border-[#ED1C24]/40" : "border-[#FFCC00]/40"
            )}
          >
            <Input
              id="momo-phone"
              label={
                gateway === "airtel_money"
                  ? "Airtel Money number to charge"
                  : "MTN MoMo number to charge"
              }
              placeholder={gateway === "airtel_money" ? "0752 123 456" : "0772 123 456"}
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void startCheckout();
              }}
              required
            />
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                Exact amount:{" "}
                <strong className="text-foreground">
                  {currency} {amount.toLocaleString()}
                </strong>
              </li>
              <li>You will get a PIN prompt on this phone (not in the browser)</li>
              <li>Keep this page open until payment is confirmed</li>
            </ul>
            <Button
              type="button"
              size="lg"
              className="w-full font-bold"
              style={{
                backgroundColor: brand.bg,
                color: gateway === "airtel_money" ? "#fff" : "#FFCC00",
              }}
              loading={loading}
              onClick={() => void startCheckout()}
            >
              {gateway === "airtel_money"
                ? `Charge Airtel · ${currency} ${amount.toLocaleString()}`
                : `Charge MTN · ${currency} ${amount.toLocaleString()}`}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setPhase("select")}>
              ← Change payment method
            </Button>
          </div>
        </div>
      )}

      {/* Live: wait for PIN on phone (PawaPay → Airtel / MTN) */}
      {phase === "awaiting" && session && (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-6 text-white shadow-lg"
            style={{
              background:
                gateway === "airtel_money"
                  ? "linear-gradient(145deg, #ED1C24 0%, #7f0e14 100%)"
                  : "linear-gradient(145deg, #004F71 0%, #0a2a38 100%)",
            }}
          >
            <div
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: gateway === "airtel_money" ? "#fff" : "#FFCC00" }}
            >
              <SmartphoneNfc className="h-4 w-4" />
              {gateway === "airtel_money"
                ? "Airtel Money · approve on phone"
                : "MTN MoMo · approve on phone"}
            </div>
            <p className="text-3xl font-black mt-3">
              {currency} {amount.toLocaleString()}
            </p>
            <p className="text-sm text-white/90 mt-2">
              PawaPay sent a charge to{" "}
              <span className="font-semibold text-white">
                {formatUgPhoneDisplay(session.msisdn || phone)}
              </span>
              {gateway === "airtel_money" ? " (Airtel Money)" : " (MTN MoMo)"}
            </p>
            <ol className="mt-4 space-y-2 text-sm text-white/95 list-decimal list-inside">
              <li>Unlock the phone for that number</li>
              <li>
                Open the {gateway === "airtel_money" ? "Airtel Money" : "MTN"} push / USSD prompt
              </li>
              <li>
                Enter your{" "}
                <strong className={gateway === "airtel_money" ? "text-white" : "text-[#FFCC00]"}>
                  {gateway === "airtel_money" ? "Airtel Money PIN" : "MoMo PIN"}
                </strong>{" "}
                to pay {currency} {amount.toLocaleString()}
              </li>
            </ol>
            <p className="text-xs text-white/60 mt-3 font-mono break-all">
              Ref: {session.externalId}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border-2 bg-card p-6 text-center space-y-4",
              gateway === "airtel_money" ? "border-[#ED1C24]/40" : "border-[#FFCC00]/50"
            )}
          >
            <Loader2
              className={cn(
                "h-10 w-10 animate-spin mx-auto",
                gateway === "airtel_money" ? "text-[#ED1C24]" : "text-[#004F71]"
              )}
            />
            <p className="font-bold">
              Waiting for {gateway === "airtel_money" ? "Airtel" : "MTN"} confirmation…
            </p>
            <p className="text-sm text-muted-foreground">{awaitMsg}</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  gateway === "airtel_money"
                    ? "bg-gradient-to-r from-[#ED1C24] to-[#ff6b6b]"
                    : "bg-gradient-to-r from-[#004F71] to-[#FFCC00]"
                )}
                style={{ width: `${Math.min(95, (pollCount / MAX_POLLS) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Check #{pollCount} · auto-refresh every {POLL_MS / 1000}s
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => session && void pollLiveStatus(session, gateway)}
              >
                I approved — check again
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  stopPolling();
                  setPhase("phone");
                }}
              >
                Cancel / change number
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo only: in-app PIN when not live */}
      {phase === "pin" && session && isMobileMoney && (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5 text-white shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${brand.bg} 0%, #0a2a38 100%)`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <KeyRound className="h-4 w-4" style={{ color: brand.accent }} />
                Approve payment
              </div>
              <Badge className="bg-white/15 text-white border-0 text-[10px]">
                Test environment
              </Badge>
            </div>
            <p className="text-3xl font-black mt-3">
              {currency} {amount.toLocaleString()}
            </p>
            <p className="text-sm text-white/85 mt-2">
              Linked to <span className="font-semibold text-white">{formatUgPhoneDisplay(phone)}</span>
            </p>
            <p className="text-xs mt-3 rounded-lg bg-black/20 px-3 py-2 text-white/90">
              Live mobile money is not configured on this environment. Use the PIN pad below only for
              non-production testing.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#FFCC00]/40 bg-card p-5 space-y-4 shadow-md">
            <div className="text-center space-y-1">
              <p className="font-bold text-base">Enter test PIN</p>
              <p className="text-xs text-muted-foreground">
                Type any <strong>4 digits</strong> (e.g. 1234)
              </p>
            </div>
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-all",
                    pin.length > i
                      ? "bg-foreground border-foreground scale-110"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                if (key === "") return <div key="spacer" />;
                if (key === "del") {
                  return (
                    <button
                      key="del"
                      type="button"
                      onClick={clearPinDigit}
                      className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center"
                      aria-label="Delete"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => appendPinDigit(key)}
                    className="h-14 rounded-xl bg-muted hover:bg-muted/80 text-xl font-bold active:scale-95"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full font-bold"
              style={{ backgroundColor: brand.bg, color: "#FFCC00" }}
              loading={loading}
              disabled={pin.length < 4}
              onClick={() => void completePayment("completed")}
            >
              Confirm &amp; pay {currency} {amount.toLocaleString()}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setPin("");
              setPhase("phone");
            }}
          >
            ← Change phone number
          </Button>
        </div>
      )}

      {phase === "details" && session && (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5 text-white"
            style={{
              background: `linear-gradient(135deg, ${session.instructions?.brandBg || "#004F71"}, ${session.instructions?.brandColor || "#059669"}99)`,
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">
              {session.instructions?.title || gatewayLabel(gateway)}
            </p>
            <p className="text-2xl font-black mt-1">
              {currency} {amount.toLocaleString()}
            </p>
            <ol className="mt-4 space-y-2 text-sm text-white/95 list-decimal list-inside">
              {(session.instructions?.steps || []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>

          {gateway === "mtn_momo" && useWidget && (
            <MomoPayWidget
              amount={amount}
              externalId={session.externalId}
              currency={currency}
              onSuccess={onWidgetSuccess}
              onFailed={() => setPhase("failed")}
            />
          )}

          {gateway === "card" && (
            <>
              {squareCfg?.webPaymentsReady ? (
                <SquareCardForm
                  amount={amount}
                  currency={currency}
                  applicationId={squareCfg.applicationId}
                  locationId={squareCfg.locationId}
                  env={squareCfg.env}
                  disabled={loading}
                  onToken={(sourceId) => void chargeWithSquare(sourceId)}
                  onError={(msg) => toast.error(msg)}
                />
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4" /> Card details
                    {!squareCfg?.chargeReady && (
                      <Badge variant="secondary" className="text-[10px]">
                        Card not configured
                      </Badge>
                    )}
                  </div>
                  {squareCfg && !squareCfg.webPaymentsReady && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg bg-amber-500/10 p-2">
                      Card payments are not fully configured. Please use Airtel Money or MTN MoMo,
                      or contact support.
                    </p>
                  )}
                  <Input
                    label="Card number"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiry"
                      value={card.exp}
                      onChange={(e) => setCard({ ...card, exp: e.target.value })}
                    />
                    <Input
                      label="CVC"
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-500"
                    size="lg"
                    loading={loading}
                    onClick={() => void completePayment("completed")}
                  >
                    Pay {currency} {amount.toLocaleString()}
                  </Button>
                </div>
              )}
            </>
          )}

          {gateway === "bank" && (
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 text-sm">
              <p className="font-semibold">Transfer to</p>
              <div className="rounded-xl bg-muted/50 p-4 space-y-1 font-mono text-xs">
                <p>Bank: Stanbic Bank Uganda</p>
                <p>Account name: Patriotic Youths of Uganda</p>
                <p>Account no: 9030012345678</p>
                <p>Reference: {session.externalId}</p>
              </div>
              <Button className="w-full" variant="outline" onClick={() => void completePayment("pending")}>
                I have transferred — mark pending
              </Button>
            </div>
          )}

          <Button type="button" variant="ghost" className="w-full" onClick={() => setPhase("select")}>
            ← Change payment method
          </Button>
        </div>
      )}

      <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
        <Shield className="h-3 w-3" />
        Live mode: MTN charges the exact donation amount after PIN on the donor&apos;s phone.
      </p>
    </div>
  );
}

function gatewayLabel(g: string): string {
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
      return g;
  }
}
