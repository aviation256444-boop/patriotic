"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Heart, Home, Receipt } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_RECEIPT_KEY,
  type PaymentReceipt,
} from "@/components/payments/payment-checkout";

function gatewayLabel(g: string) {
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
      return g.replace(/_/g, " ");
  }
}

function SuccessContent() {
  const search = useSearchParams();
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  useEffect(() => {
    let fromStorage: PaymentReceipt | null = null;
    try {
      const raw = sessionStorage.getItem(PAYMENT_RECEIPT_KEY);
      if (raw) fromStorage = JSON.parse(raw) as PaymentReceipt;
    } catch {
      /* ignore */
    }

    const fromQuery: PaymentReceipt = {
      paymentId: search.get("paymentId") || fromStorage?.paymentId || "",
      externalId: search.get("ref") || fromStorage?.externalId || "",
      amount: Number(search.get("amount") || fromStorage?.amount || 0),
      currency: search.get("currency") || fromStorage?.currency || "UGX",
      gateway: search.get("gateway") || fromStorage?.gateway || "mtn_momo",
      purpose: search.get("purpose") || fromStorage?.purpose || "donation",
      campaign: search.get("campaign") || fromStorage?.campaign || "",
      phone: search.get("phone") || fromStorage?.phone || "",
      paidAt: fromStorage?.paidAt || new Date().toISOString(),
    };

    if (fromQuery.externalId || fromQuery.paymentId) {
      setReceipt(fromQuery);
    } else if (fromStorage) {
      setReceipt(fromStorage);
    }
  }, [search]);

  if (!receipt || (!receipt.externalId && !receipt.paymentId)) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card p-10 text-center space-y-4">
        <p className="text-muted-foreground">
          No completed payment found. Please finish checkout first.
        </p>
        <Link
          href="/donate"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white"
        >
          Go to donate
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-card p-8 sm:p-12 text-center space-y-6 shadow-xl"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
        <CheckCircle2 className="h-11 w-11" />
      </div>

      <div className="space-y-2">
        <Badge variant="success" className="mb-2">
          Payment successful
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Thank you for your support!
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your donation was completed successfully. A receipt is saved for PYU
          admins under Donations.
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-background/80 p-6 text-left space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <Receipt className="h-4 w-4" />
          Receipt
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Amount paid</p>
            <p className="text-xl font-black text-emerald-600">
              {receipt.currency} {Number(receipt.amount).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Method</p>
            <p className="font-semibold">{gatewayLabel(receipt.gateway)}</p>
          </div>
          {receipt.campaign && (
            <div>
              <p className="text-xs text-muted-foreground">Campaign</p>
              <p className="font-medium capitalize">{receipt.campaign}</p>
            </div>
          )}
          {receipt.phone && (
            <div>
              <p className="text-xs text-muted-foreground">MoMo number</p>
              <p className="font-medium">{receipt.phone}</p>
            </div>
          )}
        </div>
        <p className="text-[11px] font-mono text-muted-foreground break-all pt-2 border-t border-border/50">
          Ref: {receipt.externalId || receipt.paymentId}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href="/donate"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <Heart className="h-4 w-4" />
          Donate again
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/30 px-8 text-sm font-semibold hover:bg-emerald-500/10"
        >
          <Home className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </motion.div>
  );
}

export default function DonateSuccessPage() {
  return (
    <>
      <PageHero
        badge="Donation complete"
        title="Payment successful"
        description="Your contribution was confirmed before this page opened."
      />
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="rounded-3xl border border-border/50 p-12 text-center text-muted-foreground">
                Loading receipt…
              </div>
            }
          >
            <SuccessContent />
          </Suspense>
        </div>
      </section>
    </>
  );
}
