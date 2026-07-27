import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { upsertItem } from "@/lib/cms/store";
import { requestToPay } from "@/lib/momo/collections";
import { getMomoCurrency, isMomoEnabled } from "@/lib/momo/config";

export const dynamic = "force-dynamic";

/**
 * Creates a pending payment record and optionally starts RequestToPay
 * when a MoMo phone number is provided (charges the subscriber).
 */
export async function POST(request: Request) {
  try {
    if (!isMomoEnabled()) {
      return NextResponse.json({ error: "MoMo payments disabled" }, { status: 403 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || getMomoCurrency()).toUpperCase();
    const phone = body.phone ? String(body.phone) : "";
    const purpose = String(body.purpose || "donation"); // donation | event | membership
    const campaign = String(body.campaign || "general");
    const donorName = body.donorName ? String(body.donorName) : "";
    const email = body.email ? String(body.email) : "";
    const message = body.message ? String(body.message) : "";
    const isAnonymous = Boolean(body.isAnonymous);
    const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

    if (!amount || amount < 500) {
      return NextResponse.json({ error: "Minimum amount is 500" }, { status: 400 });
    }

    const externalId = `PYU-${purpose.toUpperCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const paymentId = randomUUID();

    const record = await upsertItem(
      "donations",
      {
        id: paymentId,
        amount,
        currency,
        donorName: isAnonymous ? "Anonymous" : donorName || "Donor",
        isAnonymous,
        campaign: purpose === "donation" ? campaign : `${purpose}:${campaign}`,
        message,
        email,
        phone: phone || undefined,
        status: "pending",
        paymentMethod: phone ? "momo_request_to_pay" : "momo_widget",
        externalId,
        momoReferenceId: null,
        purpose,
        meta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "momo-api"
    );

    let requestToPayResult = null as null | {
      ok: boolean;
      referenceId?: string;
      status?: string;
      error?: string;
      demo?: boolean;
    };

    if (phone) {
      requestToPayResult = await requestToPay({
        amount,
        currency,
        phone,
        externalId,
        payerMessage: `PYU ${purpose}`,
        payeeNote: campaign,
      });

      if (requestToPayResult.ok && requestToPayResult.referenceId) {
        await upsertItem(
          "donations",
          {
            ...record,
            momoReferenceId: requestToPayResult.referenceId,
            status: "pending",
            paymentMethod: "momo_request_to_pay",
            demo: requestToPayResult.demo || false,
          },
          "momo-api"
        );
      }
    }

    return NextResponse.json({
      success: true,
      paymentId,
      externalId,
      amount,
      currency,
      requestToPay: requestToPayResult,
      widget: {
        apiUserId: process.env.NEXT_PUBLIC_MOMO_API_USER_ID || process.env.MOMO_API_USER_ID,
        // Client uses public config for widget attributes
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
