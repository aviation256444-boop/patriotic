import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { upsertItem } from "@/lib/cms/store";
import { requestToPay } from "@/lib/momo/collections";
import {
  getMomoCurrency,
  isMomoEnabled,
  hasCollectionsCredentials,
  getMomoEnv,
} from "@/lib/momo/config";
import { airtelRequestPayment } from "@/lib/airtel/collections";
import {
  isAirtelEnabled,
  hasAirtelCredentials,
  getAirtelEnv,
  getAirtelConfig,
} from "@/lib/airtel/config";
import type { PaymentGateway } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

/**
 * Unified checkout.
 * MTN MoMo + phone + Collections credentials → real RequestToPay for the donation amount.
 * Donor approves with MoMo PIN on their phone; app polls until SUCCESSFUL.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || getMomoCurrency() || "UGX").toUpperCase();
    const gateway = String(body.gateway || "mtn_momo") as PaymentGateway;
    const purpose = String(body.purpose || "donation");
    const campaign = String(body.campaign || "general");
    const phone = body.phone ? String(body.phone).replace(/\s/g, "") : "";
    const donorName = body.donorName ? String(body.donorName) : "";
    const email = body.email ? String(body.email) : "";
    const message = body.message ? String(body.message) : "";
    const isAnonymous = Boolean(body.isAnonymous);
    const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

    if (!amount || amount < 500) {
      return NextResponse.json({ error: "Minimum amount is 500" }, { status: 400 });
    }

    if ((gateway === "mtn_momo" || gateway === "airtel_money") && body.requirePhone && !phone) {
      return NextResponse.json({ error: "Phone number required for mobile money" }, { status: 400 });
    }

    const externalId = `PYU-${purpose.toUpperCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    const paymentId = randomUUID();

    let providerRef: string | undefined;
    let demoMode = true;
    let liveCharge = false;
    let msisdn: string | undefined;
    let chargedAmount: string | undefined;
    let chargedCurrency: string | undefined;
    let providerMessage =
      "Demo checkout ready — complete the on-screen steps to finish payment.";
    let rtpError: string | undefined;

    // MTN: charge the wallet for this exact amount via Collections RequestToPay
    if (gateway === "mtn_momo" && phone && isMomoEnabled()) {
      if (!hasCollectionsCredentials()) {
        providerRef = `MOMO-DEMO-${Date.now()}`;
        demoMode = true;
        liveCharge = false;
        providerMessage =
          "MoMo keys not configured — demo only. Add Collections keys to charge real wallets.";
      } else {
        const rtp = await requestToPay({
          amount,
          currency,
          phone,
          externalId,
          payerMessage: `PYU ${purpose} ${currency} ${amount}`,
          payeeNote: `Patriotic Youths of Uganda - ${campaign}`,
        });

        if (!rtp.ok) {
          return NextResponse.json(
            {
              error:
                rtp.error ||
                "MTN could not start the payment. Check the phone number and try again.",
              code: "MOMO_RTP_FAILED",
              env: getMomoEnv(),
            },
            { status: 502 }
          );
        }

        providerRef = rtp.referenceId;
        demoMode = Boolean(rtp.demo);
        liveCharge = Boolean(rtp.live);
        msisdn = rtp.msisdn;
        chargedAmount = rtp.amount;
        chargedCurrency = rtp.currency;

        if (liveCharge) {
          providerMessage =
            `MTN is charging ${currency} ${amount.toLocaleString()} to ${msisdn || phone}. ` +
            "Enter your MoMo PIN on your phone when the prompt appears.";
        } else {
          providerMessage =
            "Demo MoMo session — use the on-screen PIN to simulate approval.";
        }
      }
    } else if (gateway === "mtn_momo") {
      providerRef = `MOMO-DEMO-${Date.now()}`;
      providerMessage =
        "MTN MoMo demo — enter PIN on the next screen to simulate a successful charge.";
    } else if (gateway === "airtel_money" && phone && isAirtelEnabled()) {
      // Airtel Collection-API (Sandbox Collection-API's.json) — USSD push charge
      if (!hasAirtelCredentials()) {
        providerRef = `AIRTEL-DEMO-${Date.now()}`;
        demoMode = true;
        liveCharge = false;
        providerMessage =
          "Airtel keys not configured — demo only. Add AIRTEL_CLIENT_ID + AIRTEL_CLIENT_SECRET.";
      } else {
        const airtel = await airtelRequestPayment({
          amount,
          currency,
          phone,
          externalId,
          reference: `PYU ${purpose}`.slice(0, 64),
        });

        if (!airtel.ok) {
          return NextResponse.json(
            {
              error:
                airtel.error ||
                "Airtel could not start the payment. Check the number and try again.",
              code: "AIRTEL_PAY_FAILED",
              env: getAirtelEnv(),
              collectionPath: getAirtelConfig().collectionPath,
            },
            { status: 502 }
          );
        }

        providerRef = airtel.transactionId || airtel.referenceId;
        demoMode = Boolean(airtel.demo);
        liveCharge = Boolean(airtel.live);
        msisdn = airtel.msisdn;
        chargedAmount = airtel.amount;
        chargedCurrency = airtel.currency;

        if (liveCharge) {
          providerMessage =
            `Airtel is charging ${currency} ${amount.toLocaleString()} to ${msisdn || phone}. ` +
            "Enter your Airtel Money PIN on the phone prompt.";
        } else {
          providerMessage =
            "Demo Airtel session — use the on-screen PIN to simulate approval.";
        }
      }
    } else if (gateway === "airtel_money") {
      providerRef = `AIRTEL-DEMO-${Date.now()}`;
      demoMode = true;
      providerMessage =
        "Airtel Money demo — enter PIN on the next screen to complete payment.";
    } else if (gateway === "card") {
      // Square Web Payments handles live card charge after session create
      providerRef = `CARD-${Date.now()}`;
      demoMode = true;
      providerMessage =
        "Enter your card securely via Square. Payment is confirmed before the success page.";
    } else if (gateway === "bank") {
      providerRef = `BANK-DEMO-${Date.now()}`;
      demoMode = true;
      providerMessage = "Bank transfer recorded as pending until admin confirms.";
    }

    await upsertItem(
      "donations",
      {
        id: paymentId,
        amount,
        currency,
        donorName: isAnonymous ? "Anonymous" : donorName || "Supporter",
        isAnonymous,
        campaign: purpose === "donation" ? campaign : `${purpose}:${campaign}`,
        message,
        email,
        phone: phone || undefined,
        status: "pending",
        paymentMethod: gateway,
        externalId,
        purpose,
        meta: {
          ...meta,
          msisdn,
          chargedAmount,
          chargedCurrency,
          liveCharge,
        },
        momoReferenceId: providerRef || null,
        airtelTransactionId: gateway === "airtel_money" ? providerRef || null : null,
        demoMode,
        liveCharge,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "checkout-api"
    );

    return NextResponse.json({
      success: true,
      paymentId,
      externalId,
      amount,
      currency,
      gateway,
      status: "pending",
      demoMode,
      liveCharge,
      providerRef,
      msisdn,
      chargedAmount: chargedAmount || String(Math.round(amount)),
      chargedCurrency: chargedCurrency || currency,
      message: providerMessage,
      error: rtpError,
      momoEnv: getMomoEnv(),
      airtelEnv: getAirtelEnv(),
      instructions: getInstructions(gateway, amount, currency, phone, liveCharge),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}

function getInstructions(
  gateway: PaymentGateway,
  amount: number,
  currency: string,
  phone: string,
  liveCharge: boolean
) {
  const amt = `${currency} ${amount.toLocaleString()}`;
  switch (gateway) {
    case "mtn_momo":
      return {
        title: "MTN Mobile Money",
        steps: liveCharge
          ? [
              `MTN will charge ${amt} to ${phone}.`,
              "Unlock your phone and enter your MoMo PIN on the MTN prompt (USSD / push).",
              "Do not close this page — we wait for MTN to confirm the payment.",
            ]
          : [
              phone
                ? `A payment request of ${amt} is linked to ${phone}.`
                : `You will confirm payment of ${amt} via MTN MoMo.`,
              "Enter your MoMo PIN when prompted (demo: any 4 digits).",
              "Wait for confirmation — your receipt appears next.",
            ],
        brandColor: "#FFCC00",
        brandBg: "#004F71",
      };
    case "airtel_money":
      return {
        title: "Airtel Money",
        steps: liveCharge
          ? [
              `Airtel will charge ${amt} to ${phone}.`,
              "Unlock your phone and enter your Airtel Money PIN on the USSD prompt.",
              "Do not close this page — we wait for Airtel to confirm the payment.",
            ]
          : [
              phone
                ? `A payment request of ${amt} is linked to ${phone}.`
                : "Confirm Airtel Money payment below.",
              `Amount: ${amt}`,
              "Enter your Airtel Money PIN (demo: any 4 digits).",
            ],
        brandColor: "#ED1C24",
        brandBg: "#ED1C24",
      };
    case "card":
      return {
        title: "Card payment (Square)",
        steps: [
          `Pay ${amt} with Visa / Mastercard via Square.`,
          "Your card is tokenized securely in the browser.",
          "You only leave this page after Square confirms the charge.",
        ],
        brandColor: "#635BFF",
        brandBg: "#0A2540",
      };
    case "bank":
      return {
        title: "Bank transfer",
        steps: [
          `Transfer ${amt} to PYU account (see details).`,
          "Use your payment reference as the narration.",
          "Admin will mark as completed after verification.",
        ],
        brandColor: "#059669",
        brandBg: "#064e3b",
      };
    default:
      return { title: "Payment", steps: [], brandColor: "#059669", brandBg: "#064e3b" };
  }
}
