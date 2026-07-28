import { NextResponse } from "next/server";
import {
  getPawaPayConfig,
  getPawaPayEnv,
  shouldUsePawaPay,
  hasPawaPayCredentials,
  isPawaPayEnabled,
} from "@/lib/pawapay/config";

export const dynamic = "force-dynamic";

/**
 * Public-ish setup helper (no secrets).
 * Shows exact callback URLs to paste into PawaPay dashboard.
 */
export async function GET() {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PAWAPAY_PUBLIC_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const callback = `${appUrl}/api/payments/pawapay/callback`;
  const cfg = getPawaPayConfig();

  return NextResponse.json({
    ready: shouldUsePawaPay(),
    enabled: isPawaPayEnabled(),
    hasToken: hasPawaPayCredentials(),
    env: getPawaPayEnv(),
    baseUrl: cfg.baseUrl,
    appUrl,
    country: cfg.country,
    currency: cfg.currency,
    /** Paste these into PawaPay Dashboard → Callback URLs */
    callbacks: {
      checkouts: callback,
      deposits: callback,
      payouts: callback,
      refunds: callback,
    },
    dashboard: {
      sandboxCallbacks:
        "https://dashboard.sandbox.pawapay.io/#/system/callback-url",
      sandboxTokens: "https://dashboard.sandbox.pawapay.io/#/system/api-token",
      sandboxDeposits:
        "https://dashboard.sandbox.pawapay.io/#/transactions/deposits",
    },
    testNumbers: {
      mtnSuccess: "0783456789",
      mtnSuccessMsisdn: "256783456789",
      airtelSuccess: "0753456789",
      airtelSuccessMsisdn: "256753456789",
    },
    howToTest: [
      "1. Set PAWAPAY_API_TOKEN in .env.local (from Developers → API tokens).",
      "2. Set NEXT_PUBLIC_APP_URL to your public tunnel or domain (HTTPS).",
      "3. Paste callbacks.deposits URL into PawaPay Deposits field (and others).",
      "4. Save in dashboard. Restart npm run dev.",
      "5. Open /donate → MTN MoMo → phone 0783456789 → wait for success.",
      "6. Check PawaPay Deposits page + your /donate/success page.",
    ],
  });
}
