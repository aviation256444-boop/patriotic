import { NextResponse } from "next/server";
import { upsertItem, getCollection } from "@/lib/cms/store";
import { createSquarePayment } from "@/lib/square/payments";
import {
  hasSquareChargeCredentials,
  getSquareEnv,
  isSquareEnabled,
} from "@/lib/square/config";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

/**
 * Charge a Square card nonce for an existing pending checkout session.
 * Body: { paymentId, externalId, sourceId, amount?, currency? }
 */
export async function POST(request: Request) {
  try {
    if (!isSquareEnabled()) {
      return NextResponse.json({ error: "Square payments disabled" }, { status: 403 });
    }

    const body = await request.json();
    const paymentId = String(body.paymentId || "");
    const externalId = String(body.externalId || "");
    const sourceId = String(body.sourceId || body.token || "");
    const amountHint = body.amount != null ? Number(body.amount) : undefined;
    const currencyHint = body.currency ? String(body.currency).toUpperCase() : undefined;

    if (!sourceId) {
      return NextResponse.json({ error: "Missing card token (sourceId)" }, { status: 400 });
    }

    const donations = (await getCollection("donations")) as (CmsDonation & {
      externalId?: string;
      paymentMethod?: string;
    })[];

    const donation =
      donations.find((d) => d.id === paymentId) ||
      donations.find((d) => d.externalId === externalId);

    if (!donation) {
      return NextResponse.json(
        { error: "Payment session not found. Start checkout again." },
        { status: 404 }
      );
    }

    const amount = amountHint || Number(donation.amount);
    const currency = currencyHint || String(donation.currency || "UGX");

    const result = await createSquarePayment({
      sourceId,
      amount,
      currency,
      idempotencyKey: body.idempotencyKey || `${donation.id}-square`,
      note: `PYU ${donation.campaign || "donation"}`,
      referenceId: donation.externalId || donation.id,
      buyerEmail: donation.email || undefined,
    });

    if (!result.ok) {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "failed",
          failureReason: result.error,
          updatedAt: new Date().toISOString(),
        },
        "square-charge"
      );
      return NextResponse.json(
        {
          error: result.error || "Card payment failed",
          squareEnv: getSquareEnv(),
          configured: hasSquareChargeCredentials(),
        },
        { status: 402 }
      );
    }

    const completed = result.status === "COMPLETED" || result.status === "APPROVED" || result.demo;
    const updated = await upsertItem(
      "donations",
      {
        ...donation,
        id: donation.id,
        status: completed ? "completed" : "pending",
        paymentMethod: "card",
        paymentReference: result.paymentId,
        squarePaymentId: result.paymentId,
        squareReceiptUrl: result.receiptUrl,
        demoMode: Boolean(result.demo),
        paidAt: completed ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      },
      "square-charge"
    );

    return NextResponse.json({
      success: true,
      status: completed ? "completed" : "pending",
      paymentId: donation.id,
      externalId: donation.externalId,
      squarePaymentId: result.paymentId,
      receiptUrl: result.receiptUrl,
      demo: result.demo,
      donation: updated,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Square charge failed" },
      { status: 500 }
    );
  }
}
