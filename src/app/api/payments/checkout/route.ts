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
import { shouldUsePawaPay, getPawaPayEnv, getPawaPayCurrency } from "@/lib/pawapay/config";
import { initiateDeposit } from "@/lib/pawapay/deposits";
import type { PaymentGateway } from "@/lib/payments/types";
import { isPaymentDemoAllowed } from "@/lib/payments/demo";

export const dynamic = "force-dynamic";

/**
 * Unified checkout.
 * Prefer PawaPay for MTN/Airtel when PAWAPAY_API_TOKEN is set (works on localhost via poll).
 * Fallback: direct MTN MoMo Collections / Airtel Collection API.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(
      body.currency || getPawaPayCurrency() || getMomoCurrency() || "UGX"
    ).toUpperCase();
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
      return NextResponse.json({ error: "Minimum amount is UGX 500" }, { status: 400 });
    }
    if (amount > 5_000_000) {
      return NextResponse.json(
        { error: "Maximum amount is UGX 5,000,000 per payment" },
        { status: 400 }
      );
    }

    if ((gateway === "mtn_momo" || gateway === "airtel_money") && body.requirePhone && !phone) {
      return NextResponse.json({ error: "Phone number required for mobile money" }, { status: 400 });
    }

    const allowDemo = isPaymentDemoAllowed();

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
    let provider = "demo";
    let providerMessage =
      "Demo checkout ready — complete the on-screen steps to finish payment.";
    let rtpError: string | undefined;

    const isMobileMoney = gateway === "mtn_momo" || gateway === "airtel_money";
    const usePawaPay = isMobileMoney && phone && shouldUsePawaPay();

    // ── PawaPay (preferred for MTN + Airtel) — works on http://localhost:3000 ──
    if (usePawaPay) {
      const deposit = await initiateDeposit({
        depositId: paymentId,
        amount,
        currency,
        phone,
        gateway: gateway as "mtn_momo" | "airtel_money",
        statementDescription: "PYU Donation",
        metadata: [
          { fieldName: "externalId", fieldValue: externalId },
          { fieldName: "purpose", fieldValue: purpose },
          { fieldName: "campaign", fieldValue: campaign },
        ],
      });

      if (!deposit.ok) {
        return NextResponse.json(
          {
            error:
              deposit.error ||
              "PawaPay could not start the payment. Check the phone number and try again.",
            code: "PAWAPAY_DEPOSIT_FAILED",
            env: getPawaPayEnv(),
            rejectionCode: deposit.rejectionCode,
          },
          { status: 502 }
        );
      }

      providerRef = deposit.depositId || paymentId;
      demoMode = Boolean(deposit.demo);
      liveCharge = Boolean(deposit.live);
      msisdn = deposit.msisdn;
      chargedAmount = deposit.amount;
      chargedCurrency = deposit.currency;
      provider = "pawapay";

      const brand = gateway === "airtel_money" ? "Airtel Money" : "MTN MoMo";
      if (liveCharge) {
        providerMessage =
          `PawaPay is requesting ${currency} ${amount.toLocaleString()} from ${msisdn || phone} via ${brand}. ` +
          (getPawaPayEnv() === "sandbox"
            ? "Sandbox: use a PawaPay test number (e.g. 0783456789 for MTN success)."
            : "Enter your mobile money PIN on the phone prompt.");
      } else {
        providerMessage =
          "PawaPay demo (no token) — use the on-screen PIN to simulate approval.";
      }
    } else if (gateway === "mtn_momo" && phone && isMomoEnabled()) {
      // Fallback: direct MTN Collections
      if (!hasCollectionsCredentials()) {
        if (!allowDemo) {
          return NextResponse.json(
            {
              error:
                "Live mobile money is not configured. Set PAWAPAY_API_TOKEN on the server (Render Environment), then redeploy.",
              code: "PAYMENT_NOT_CONFIGURED",
            },
            { status: 503 }
          );
        }
        providerRef = `MOMO-DEMO-${Date.now()}`;
        demoMode = true;
        liveCharge = false;
        provider = "momo";
        providerMessage =
          "MoMo keys not configured — demo only. Add PAWAPAY_API_TOKEN or MoMo Collections keys.";
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
        provider = "momo";

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
      if (!allowDemo) {
        return NextResponse.json(
          {
            error:
              "Could not start live MTN payment. Add PAWAPAY_API_TOKEN and ensure PawaPay is enabled, then try again with a valid MTN number.",
            code: "PAYMENT_NOT_CONFIGURED",
          },
          { status: 503 }
        );
      }
      providerRef = `MOMO-DEMO-${Date.now()}`;
      provider = "momo";
      providerMessage =
        "MTN MoMo demo — enter PIN on the next screen to simulate a successful charge.";
    } else if (gateway === "airtel_money" && phone && isAirtelEnabled()) {
      if (!hasAirtelCredentials()) {
        if (!allowDemo) {
          return NextResponse.json(
            {
              error:
                "Live mobile money is not configured. Set PAWAPAY_API_TOKEN on the server (Render Environment), then redeploy.",
              code: "PAYMENT_NOT_CONFIGURED",
            },
            { status: 503 }
          );
        }
        providerRef = `AIRTEL-DEMO-${Date.now()}`;
        demoMode = true;
        liveCharge = false;
        provider = "airtel";
        providerMessage =
          "Airtel keys not configured — demo only. Add PAWAPAY_API_TOKEN or Airtel credentials.";
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
        provider = "airtel";

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
      if (!allowDemo) {
        return NextResponse.json(
          {
            error:
              "Could not start live Airtel payment. Add PAWAPAY_API_TOKEN and try again with a valid Airtel number.",
            code: "PAYMENT_NOT_CONFIGURED",
          },
          { status: 503 }
        );
      }
      providerRef = `AIRTEL-DEMO-${Date.now()}`;
      demoMode = true;
      provider = "airtel";
      providerMessage =
        "Airtel Money demo — enter PIN on the next screen to complete payment.";
    } else if (gateway === "card") {
      // Square Web Payments handles live card charge after session create
      providerRef = `CARD-${Date.now()}`;
      demoMode = true;
      provider = "square";
      providerMessage =
        "Enter your card securely via Square. Payment is confirmed before the success page.";
    } else if (gateway === "bank") {
      providerRef = `BANK-${Date.now()}`;
      demoMode = true;
      provider = "bank";
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
          provider,
        },
        momoReferenceId: providerRef || null,
        airtelTransactionId: gateway === "airtel_money" ? providerRef || null : null,
        pawapayDepositId: provider === "pawapay" ? providerRef || null : null,
        paymentProvider: provider,
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
      provider,
      providerRef,
      msisdn,
      chargedAmount: chargedAmount || String(Math.round(amount)),
      chargedCurrency: chargedCurrency || currency,
      message: providerMessage,
      error: rtpError,
      momoEnv: getMomoEnv(),
      airtelEnv: getAirtelEnv(),
      pawaPayEnv: getPawaPayEnv(),
      instructions: getInstructions(
        gateway,
        amount,
        currency,
        phone,
        liveCharge,
        provider
      ),
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
  liveCharge: boolean,
  provider = "demo"
) {
  const amt = `${currency} ${amount.toLocaleString()}`;
  const viaPawa = provider === "pawapay";
  switch (gateway) {
    case "mtn_momo":
      return {
        title: viaPawa ? "MTN MoMo (PawaPay)" : "MTN Mobile Money",
        steps: liveCharge
          ? [
              viaPawa
                ? `PawaPay will request ${amt} from ${phone} on MTN.`
                : `MTN will charge ${amt} to ${phone}.`,
              "Unlock your phone and enter your MoMo PIN on the prompt (USSD / push).",
              "Do not close this page — we poll until payment is confirmed.",
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
        title: viaPawa ? "Airtel Money (PawaPay)" : "Airtel Money",
        steps: liveCharge
          ? [
              viaPawa
                ? `PawaPay will request ${amt} from ${phone} on Airtel.`
                : `Airtel will charge ${amt} to ${phone}.`,
              "Unlock your phone and enter your Airtel Money PIN on the USSD prompt.",
              "Do not close this page — we poll until payment is confirmed.",
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
