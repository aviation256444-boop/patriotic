/**
 * Square Payments API — create a payment from a Web Payments SDK sourceId (card nonce).
 * Server-side only. Never call with the access token from the browser.
 */

import {
  getSquareAccessToken,
  getSquareApiBaseUrl,
  getSquareEnv,
  getSquareLocationId,
  hasSquareChargeCredentials,
} from "./config";
import { randomUUID } from "crypto";

export type SquareChargeInput = {
  sourceId: string;
  amount: number;
  currency?: string;
  /** Unique key so retries don't double-charge */
  idempotencyKey?: string;
  note?: string;
  referenceId?: string;
  buyerEmail?: string;
};

export type SquareChargeResult = {
  ok: boolean;
  paymentId?: string;
  status?: string;
  receiptUrl?: string;
  error?: string;
  demo?: boolean;
  /** Amount actually sent to Square (after currency conversion) */
  chargedAmount?: number;
  chargedCurrency?: string;
  raw?: unknown;
};

const ZERO_DECIMAL = new Set([
  "UGX",
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "BIF",
  "DJF",
  "GNF",
  "KMF",
  "PYG",
  "RWF",
  "XAF",
  "XOF",
  "XPF",
]);

/**
 * Sandbox Default Test Account is USD. Convert UGX donations so card charge works.
 */
function toSquareAmountMoney(amount: number, currency: string): {
  amount: number;
  currency: string;
  noteExtra?: string;
} {
  const locCurrency = (
    process.env.SQUARE_LOCATION_CURRENCY ||
    (getSquareEnv() === "sandbox" ? "USD" : currency)
  ).toUpperCase();
  const from = currency.toUpperCase();

  if (from === locCurrency) {
    return {
      amount: ZERO_DECIMAL.has(from)
        ? Math.round(amount)
        : Math.round(amount * 100),
      currency: from,
    };
  }

  // UGX → USD (sandbox)
  if (from === "UGX" && locCurrency === "USD") {
    const rate = Number(process.env.SQUARE_UGX_PER_USD || 3700);
    const usd = Math.max(1, Math.round(amount / rate)); // min $1
    return {
      amount: usd * 100, // cents
      currency: "USD",
      noteExtra: `Converted from UGX ${amount.toLocaleString()} @ ~${rate} UGX/USD`,
    };
  }

  // Fallback: send as-is in location currency major units
  return {
    amount: ZERO_DECIMAL.has(locCurrency)
      ? Math.round(amount)
      : Math.round(amount * 100),
    currency: locCurrency,
  };
}

/**
 * Charge a card token from Square Web Payments SDK.
 */
export async function createSquarePayment(
  input: SquareChargeInput
): Promise<SquareChargeResult> {
  const amount = Math.round(Number(input.amount));
  const currency = (input.currency || "UGX").toUpperCase();

  if (!amount || amount < 1) {
    return { ok: false, error: "Invalid amount" };
  }
  if (!input.sourceId) {
    return { ok: false, error: "Missing card token (sourceId)" };
  }

  if (!hasSquareChargeCredentials()) {
    if (input.sourceId.startsWith("cnon:") || input.sourceId === "demo") {
      return {
        ok: true,
        paymentId: `sq-demo-${Date.now()}`,
        status: "COMPLETED",
        demo: true,
      };
    }
    return {
      ok: false,
      error:
        "Square is not fully configured. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to .env.local",
    };
  }

  const token = getSquareAccessToken();
  const locationId = getSquareLocationId();
  const base = getSquareApiBaseUrl();
  const idempotencyKey = input.idempotencyKey || randomUUID();
  const money = toSquareAmountMoney(amount, currency);

  const noteParts = [input.note || "PYU payment", money.noteExtra].filter(Boolean);

  const body = {
    source_id: input.sourceId,
    idempotency_key: idempotencyKey,
    amount_money: {
      amount: money.amount,
      currency: money.currency,
    },
    location_id: locationId,
    autocomplete: true,
    note: noteParts.join(" · ").slice(0, 500),
    reference_id: (input.referenceId || "").slice(0, 40) || undefined,
    buyer_email_address: input.buyerEmail || undefined,
  };

  const res = await fetch(`${base}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Square-Version": "2024-12-18",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    payment?: {
      id?: string;
      status?: string;
      receipt_url?: string;
    };
    errors?: Array<{ detail?: string; code?: string; category?: string }>;
  };

  if (!res.ok) {
    const detail =
      json.errors?.map((e) => e.detail || e.code).filter(Boolean).join("; ") ||
      `Square payment failed (${res.status})`;
    console.error("Square payment error", getSquareEnv(), res.status, json);
    return { ok: false, error: detail, raw: json };
  }

  const payment = json.payment;
  const status = (payment?.status || "").toUpperCase();
  const chargedMajor = ZERO_DECIMAL.has(money.currency)
    ? money.amount
    : money.amount / 100;

  if (status === "COMPLETED" || status === "APPROVED") {
    return {
      ok: true,
      paymentId: payment?.id,
      status,
      receiptUrl: payment?.receipt_url,
      chargedAmount: chargedMajor,
      chargedCurrency: money.currency,
      raw: json,
    };
  }

  return {
    ok: status === "PENDING",
    paymentId: payment?.id,
    status,
    receiptUrl: payment?.receipt_url,
    chargedAmount: chargedMajor,
    chargedCurrency: money.currency,
    error: status === "FAILED" || status === "CANCELED" ? `Payment ${status}` : undefined,
    raw: json,
  };
}
