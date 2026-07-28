/**
 * PawaPay deposits (collections) — server-side only.
 *
 * POST /deposits — initiate PIN prompt on customer phone
 * GET  /deposits/{depositId} — poll final status (works from localhost)
 *
 * Uganda:
 *   MTN    → MTN_MOMO_UGA
 *   Airtel → AIRTEL_OAPI_UGA
 */

import {
  getPawaPayBaseUrl,
  getPawaPayApiToken,
  getPawaPayCountry,
  getPawaPayCurrency,
  hasPawaPayCredentials,
  PAWAPAY_MTN_UGA,
  PAWAPAY_AIRTEL_UGA,
  getPawaPayEnv,
} from "./config";
import { randomUUID } from "crypto";

export type PawaPayGateway = "mtn_momo" | "airtel_money";

export type DepositInput = {
  /** UUIDv4 — use paymentId so status poll matches CMS row */
  depositId: string;
  amount: number;
  currency?: string;
  phone: string;
  gateway: PawaPayGateway;
  /** 4–22 alphanumeric (shown on SMS / statement) */
  statementDescription?: string;
  metadata?: { fieldName: string; fieldValue: string; isPII?: boolean }[];
};

export type DepositResult = {
  ok: boolean;
  depositId?: string;
  status?: string;
  error?: string;
  demo?: boolean;
  live?: boolean;
  msisdn?: string;
  amount?: string;
  currency?: string;
  correspondent?: string;
  rejectionCode?: string;
  raw?: unknown;
};

export type DepositStatusResult = {
  status: string;
  depositId?: string;
  reason?: string;
  error?: string;
  depositedAmount?: string;
  requestedAmount?: string;
  currency?: string;
  correspondentIds?: Record<string, string>;
  raw?: unknown;
};

/** Normalize Uganda phone to MSISDN digits only with country code (no +). */
export function normalizePawaPayMsisdn(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0") && p.length === 10) p = `256${p.slice(1)}`;
  if (p.length === 9 && (p.startsWith("7") || p.startsWith("20"))) p = `256${p}`;
  // strip leading + already handled; reject leading zeros after country
  if (p.startsWith("2560")) p = `256${p.slice(4)}`;
  return p;
}

export function correspondentForGateway(gateway: PawaPayGateway): string {
  if (gateway === "airtel_money") {
    return process.env.PAWAPAY_AIRTEL_CORRESPONDENT || PAWAPAY_AIRTEL_UGA;
  }
  return process.env.PAWAPAY_MTN_CORRESPONDENT || PAWAPAY_MTN_UGA;
}

/** statementDescription: 4–22 alphanumeric + spaces only */
function sanitizeStatement(text: string): string {
  const cleaned = text
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);
  if (cleaned.length >= 4) return cleaned;
  return "PYU Donation";
}

function authHeaders(): Record<string, string> {
  const token = getPawaPayApiToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Initiate a deposit. Customer gets PIN prompt (production) or
 * auto-resolves from sandbox test MSISDN.
 */
/**
 * Format amount for PawaPay.
 * Uganda MTN_MOMO_UGA expects 2 decimal places; Airtel UGX does not support decimals.
 * Min deposit (from active-conf): 500 UGX, max 5_000_000.
 */
export function formatPawaPayAmount(
  amount: number,
  gateway: PawaPayGateway
): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n < 1) return "";
  if (gateway === "mtn_momo") {
    return n.toFixed(2); // e.g. 10000.00
  }
  return String(n);
}

export async function initiateDeposit(input: DepositInput): Promise<DepositResult> {
  const amountStr = formatPawaPayAmount(input.amount, input.gateway);
  const currency = (input.currency || getPawaPayCurrency()).toUpperCase();
  const msisdn = normalizePawaPayMsisdn(input.phone);
  const depositId =
    input.depositId && /^[0-9a-f-]{36}$/i.test(input.depositId)
      ? input.depositId
      : randomUUID();
  const correspondent = correspondentForGateway(input.gateway);
  const country = getPawaPayCountry();

  if (!amountStr || Number(amountStr) < 1) {
    return { ok: false, error: "Invalid amount" };
  }
  if (Number(amountStr) < 500) {
    return { ok: false, error: "Minimum mobile money amount is UGX 500" };
  }
  if (Number(amountStr) > 5_000_000) {
    return { ok: false, error: "Maximum mobile money amount is UGX 5,000,000" };
  }
  if (!msisdn || msisdn.length < 11 || msisdn.length > 15) {
    return { ok: false, error: "Invalid phone number (use e.g. 0772 123 456)" };
  }

  if (!hasPawaPayCredentials()) {
    return {
      ok: true,
      depositId,
      status: "PENDING",
      demo: true,
      live: false,
      msisdn,
      amount: amountStr,
      currency,
      correspondent,
    };
  }

  // Metadata: short, alphanumeric field names; values max ~64 chars
  const safeMeta = (input.metadata || [])
    .filter((m) => m.fieldName && m.fieldValue)
    .slice(0, 5)
    .map((m) => ({
      fieldName: String(m.fieldName).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "meta",
      fieldValue: String(m.fieldValue).slice(0, 64),
      ...(m.isPII ? { isPII: true } : {}),
    }));

  const body = {
    depositId,
    amount: amountStr,
    currency,
    country,
    correspondent,
    payer: {
      type: "MSISDN",
      address: { value: msisdn },
    },
    customerTimestamp: new Date().toISOString(),
    statementDescription: sanitizeStatement(
      input.statementDescription || "PYU Donation"
    ),
    ...(safeMeta.length ? { metadata: safeMeta } : {}),
  };

  const url = `${getPawaPayBaseUrl()}/deposits`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* raw */
  }

  if (!res.ok) {
    console.error("PawaPay deposit HTTP error", res.status, text, {
      env: getPawaPayEnv(),
      msisdn,
      amount: amountStr,
    });
    const msg =
      (json.errorMessage as string) ||
      (json.message as string) ||
      text ||
      `PawaPay deposit failed (${res.status})`;
    const { humanizePawaPayError } = await import("./active-conf");
    return {
      ok: false,
      error: humanizePawaPayError(String(msg), input.gateway).slice(0, 500),
      depositId,
      msisdn,
      amount: amountStr,
      currency,
      raw: json,
    };
  }

  const status = String(json.status || "").toUpperCase();
  if (status === "REJECTED") {
    const reason = json.rejectionReason as
      | { rejectionCode?: string; rejectionMessage?: string }
      | undefined;
    const msg =
      reason?.rejectionMessage ||
      reason?.rejectionCode ||
      "Deposit rejected by PawaPay";
    const { humanizePawaPayError } = await import("./active-conf");
    return {
      ok: false,
      error: humanizePawaPayError(String(msg), input.gateway),
      depositId: String(json.depositId || depositId),
      status: "REJECTED",
      rejectionCode: reason?.rejectionCode,
      msisdn,
      amount: amountStr,
      currency,
      correspondent,
      raw: json,
    };
  }

  // ACCEPTED or DUPLICATE_IGNORED → treat as live pending
  return {
    ok: true,
    depositId: String(json.depositId || depositId),
    status: status || "ACCEPTED",
    demo: false,
    live: true,
    msisdn,
    amount: amountStr,
    currency,
    correspondent,
    raw: json,
  };
}

/** Map PawaPay deposit status → SUCCESSFUL | FAILED | PENDING */
export function mapPawaPayStatus(status: string): "SUCCESSFUL" | "FAILED" | "PENDING" {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESSFUL" || s === "SUCCESS") return "SUCCESSFUL";
  if (
    s === "FAILED" ||
    s === "REJECTED" ||
    s === "CANCELLED" ||
    s === "CANCELED" ||
    s === "EXPIRED"
  )
    return "FAILED";
  // ACCEPTED, SUBMITTED, IN_RECONCILIATION, unknown → still waiting
  return "PENDING";
}

/**
 * Poll deposit status by depositId (UUID).
 * Works from localhost — your server calls PawaPay, no public callback needed.
 */
export async function getDepositStatus(depositId: string): Promise<DepositStatusResult> {
  // Never auto-complete when token missing — prevents false “paid” receipts
  if (!hasPawaPayCredentials()) {
    return {
      status: "PENDING",
      error: "PawaPay API token not configured on the server",
      depositId,
      raw: { demo: true },
    };
  }

  if (!depositId || depositId.startsWith("PAWAPAY-DEMO") || depositId.startsWith("MOMO-DEMO") || depositId.startsWith("AIRTEL-DEMO")) {
    return { status: "PENDING", error: "No live PawaPay deposit id", depositId };
  }

  const url = `${getPawaPayBaseUrl()}/deposits/${encodeURIComponent(depositId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* raw */
  }

  if (!res.ok) {
    console.error("PawaPay status error", res.status, text);
    const errObj = json as { errorMessage?: string } | null;
    return {
      status: "ERROR",
      error: errObj?.errorMessage || text || `Status check failed (${res.status})`,
      depositId,
      raw: json,
    };
  }

  // API returns an array of at most one deposit
  const list = Array.isArray(json) ? json : json ? [json] : [];
  if (list.length === 0) {
    return {
      status: "PENDING",
      error: "Deposit not found yet",
      depositId,
      raw: json,
    };
  }

  const dep = list[0] as {
    depositId?: string;
    status?: string;
    requestedAmount?: string;
    depositedAmount?: string;
    currency?: string;
    failureReason?: { failureCode?: string; failureMessage?: string };
    correspondentIds?: Record<string, string>;
  };

  const rawStatus = String(dep.status || "UNKNOWN").toUpperCase();
  const mapped = mapPawaPayStatus(rawStatus);

  return {
    status: mapped === "SUCCESSFUL" ? "COMPLETED" : mapped === "FAILED" ? "FAILED" : rawStatus,
    depositId: dep.depositId || depositId,
    requestedAmount: dep.requestedAmount,
    depositedAmount: dep.depositedAmount,
    currency: dep.currency,
    correspondentIds: dep.correspondentIds,
    reason:
      dep.failureReason?.failureMessage ||
      dep.failureReason?.failureCode ||
      undefined,
    raw: dep,
  };
}

/** Normalize status for checkout UI (SUCCESSFUL | FAILED | PENDING) */
export function toCheckoutStatus(pawaStatus: string): "SUCCESSFUL" | "FAILED" | "PENDING" {
  return mapPawaPayStatus(pawaStatus);
}

/** Sandbox Uganda test MSISDNs (docs.pawapay.io test numbers) */
export const PAWAPAY_SANDBOX_TEST = {
  mtnCompleted: "256783456789",
  mtnFailed: "256783456029",
  airtelCompleted: "256753456789",
  airtelFailed: "256753456039",
} as const;
