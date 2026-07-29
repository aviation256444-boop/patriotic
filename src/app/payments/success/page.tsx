"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  OfficialReceipt,
  gatewayLabel,
} from "@/components/payments/official-receipt";
import {
  PAYMENT_RECEIPT_KEY,
  type PaymentReceipt,
} from "@/components/payments/payment-checkout";
import { Skeleton } from "@/components/ui/skeleton";

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
      purpose: search.get("purpose") || fromStorage?.purpose || "payment",
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
      <div className="rounded-3xl border border-border/50 bg-card p-10 text-center space-y-4 max-w-lg mx-auto">
        <p className="text-muted-foreground">
          No completed payment found. Complete checkout first.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white"
        >
          Go home
        </Link>
      </div>
    );
  }

  const isEvent = receipt.purpose === "event";
  const isMembership = receipt.purpose === "membership";

  if (isEvent) {
    return (
      <OfficialReceipt
        kind="event"
        title={
          receipt.campaign
            ? `Event payment · ${receipt.campaign.replace(/-/g, " ")}`
            : "Event payment successful"
        }
        subtitle="Your payment for this event was confirmed. If a ticket was issued, open your e-ticket for the QR entry pass (same one-page official design)."
        amount={Number(receipt.amount)}
        currency={receipt.currency || "UGX"}
        method={gatewayLabel(receipt.gateway)}
        reference={receipt.externalId || receipt.paymentId}
        paidAt={receipt.paidAt}
        statusLabel="Event payment confirmed"
        highlightRows={[
          {
            label: "Event",
            value: receipt.campaign
              ? receipt.campaign.replace(/-/g, " ")
              : "PYU event",
          },
          { label: "Type", value: "Event booking" },
          { label: "Status", value: "Paid" },
        ]}
        rows={[
          ...(receipt.phone
            ? [{ label: "Phone", value: receipt.phone }]
            : []),
          { label: "Purpose", value: "event" },
        ]}
        secondaryHref={
          receipt.campaign ? `/events/${receipt.campaign}` : "/events"
        }
        secondaryLabel="Back to event"
      />
    );
  }

  const title = isMembership
    ? "Membership payment successful"
    : "Payment successful";

  const rows = [
    ...(receipt.purpose
      ? [{ label: "Purpose", value: String(receipt.purpose) }]
      : []),
    ...(receipt.campaign
      ? [{ label: "Campaign", value: receipt.campaign }]
      : []),
    ...(receipt.phone ? [{ label: "Phone", value: receipt.phone }] : []),
  ];

  return (
    <OfficialReceipt
      kind={isMembership ? "membership" : "payment"}
      title={title}
      subtitle="This payment was confirmed by the payment provider before this receipt was issued."
      amount={Number(receipt.amount)}
      currency={receipt.currency || "UGX"}
      method={gatewayLabel(receipt.gateway)}
      reference={receipt.externalId || receipt.paymentId}
      paidAt={receipt.paidAt}
      statusLabel="Payment confirmed"
      rows={rows}
    />
  );
}

export default function PaymentSuccessPage() {
  return (
    <section className="py-10 sm:py-14 print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
        <div className="print-hide-hero no-print mb-8 text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Payment complete
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Your official receipt
          </h1>
          <p className="text-sm text-muted-foreground">
            One-page design · Events, donations &amp; membership · Print or PDF
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-3xl" />}>
          <SuccessContent />
        </Suspense>
      </div>
    </section>
  );
}
