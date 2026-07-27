/**
 * MTN MoMo Collections API — Request to Pay.
 * Charges a subscriber's MoMo wallet for the exact donation amount.
 * Real money: production credentials + X-Target-Environment mtnuganda + UGX.
 * Server-side only.
 */

import { getMomoCollectionsConfig, hasCollectionsCredentials, getMomoEnv } from "./config";
import { randomUUID } from "crypto";

export type RequestToPayInput = {
  amount: number;
  currency?: string;
  /** MSISDN e.g. 256700000000 or 0700000000 */
  phone: string;
  externalId: string;
  payerMessage?: string;
  payeeNote?: string;
};

export type RequestToPayResult = {
  ok: boolean;
  referenceId?: string;
  status?: string;
  error?: string;
  demo?: boolean;
  /** True when MTN API accepted the charge request (202) */
  live?: boolean;
  msisdn?: string;
  amount?: string;
  currency?: string;
};

/** Normalize Uganda numbers to international MSISDN without + */
export function normalizeMsisdn(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0") && p.length === 10) p = `256${p.slice(1)}`;
  if (p.length === 9 && p.startsWith("7")) p = `256${p}`;
  return p;
}

async function getAccessToken(): Promise<string | null> {
  const cfg = getMomoCollectionsConfig();
  if (!cfg.subscriptionKey || !cfg.apiUserId || !cfg.apiKey) return null;

  const auth = Buffer.from(`${cfg.apiUserId}:${cfg.apiKey}`).toString("base64");
  const res = await fetch(`${cfg.baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("MoMo token error", res.status, text);
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token || null;
}

/**
 * Currency sent to MTN RequestToPay.
 * - Production Uganda: UGX (real wallet charge in UGX).
 * - Sandbox: MTN global sandbox rejects UGX (500) — use EUR for API only.
 * Override anytime with MOMO_API_CURRENCY=UGX|EUR.
 */
function resolveRtpCurrency(requested: string): string {
  const force = process.env.MOMO_API_CURRENCY?.trim().toUpperCase();
  if (force) return force;
  const req = (requested || "UGX").toUpperCase();
  if (getMomoEnv() === "sandbox" && req === "UGX") {
    // Sandbox Collections only accepts EUR in practice
    return "EUR";
  }
  return req;
}

/** MTN rejects some unicode in payerMessage/payeeNote (HTTP 400). */
function sanitizeMomoText(text: string, max = 160): string {
  return text
    .replace(/[·•–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Initiates RequestToPay — MTN prompts the subscriber on their phone
 * to enter MoMo PIN and pay the exact amount.
 */
export async function requestToPay(input: RequestToPayInput): Promise<RequestToPayResult> {
  const cfg = getMomoCollectionsConfig();
  const amount = String(Math.round(Number(input.amount)));
  const currency = resolveRtpCurrency(input.currency || cfg.currency);
  const phone = normalizeMsisdn(input.phone);

  if (!amount || Number(amount) < 1) {
    return { ok: false, error: "Invalid amount" };
  }
  if (!phone || phone.length < 10) {
    return { ok: false, error: "Invalid phone number for MoMo" };
  }

  // No credentials → demo only (does not charge anyone)
  if (!hasCollectionsCredentials()) {
    return {
      ok: true,
      referenceId: randomUUID(),
      status: "PENDING",
      demo: true,
      live: false,
      msisdn: phone,
      amount,
      currency,
    };
  }

  const token = await getAccessToken();
  if (!token) {
    return {
      ok: false,
      error:
        "Could not authenticate with MTN MoMo. Check MOMO_API_USER_ID, MOMO_API_KEY, and Collections subscription key.",
    };
  }

  const referenceId = randomUUID();
  const payload = {
    amount,
    currency,
    externalId: sanitizeMomoText(String(input.externalId), 64).replace(/\s/g, "-") || referenceId,
    payer: {
      partyIdType: "MSISDN" as const,
      partyId: phone,
    },
    payerMessage: sanitizeMomoText(input.payerMessage || "PYU Donation"),
    payeeNote: sanitizeMomoText(input.payeeNote || "Patriotic Youths of Uganda"),
  };

  const res = await fetch(`${cfg.baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": cfg.targetEnvironment,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status !== 202 && !res.ok) {
    const text = await res.text().catch(() => "");
    console.error("RequestToPay failed", res.status, text, {
      amount,
      currency,
      phone,
      env: cfg.targetEnvironment,
    });
    let message = text || `MoMo request failed (${res.status})`;
    try {
      const j = JSON.parse(text) as { message?: string; code?: string };
      if (j.message) message = j.message;
    } catch {
      /* keep raw */
    }
    return {
      ok: false,
      error: message,
      msisdn: phone,
      amount,
      currency,
    };
  }

  return {
    ok: true,
    referenceId,
    status: "PENDING",
    demo: false,
    live: true,
    msisdn: phone,
    amount,
    currency,
  };
}

export async function getRequestToPayStatus(referenceId: string): Promise<{
  status: string;
  raw?: unknown;
  error?: string;
  financialTransactionId?: string;
  reason?: string;
}> {
  const cfg = getMomoCollectionsConfig();
  if (!hasCollectionsCredentials()) {
    return { status: "SUCCESSFUL", raw: { demo: true } };
  }

  if (!referenceId || referenceId.startsWith("MOMO-DEMO")) {
    return { status: "PENDING", error: "No live MoMo reference" };
  }

  const token = await getAccessToken();
  if (!token) return { status: "ERROR", error: "Auth failed" };

  const res = await fetch(
    `${cfg.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": cfg.targetEnvironment,
        "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { status: "ERROR", error: text || String(res.status) };
  }

  const data = (await res.json()) as {
    status?: string;
    financialTransactionId?: string;
    reason?: string;
  };
  return {
    status: data.status || "UNKNOWN",
    raw: data,
    financialTransactionId: data.financialTransactionId,
    reason: data.reason,
  };
}
