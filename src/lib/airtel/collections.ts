/**
 * Airtel Money Uganda Collection API
 * Matches Sandbox Collection-API's.json exactly:
 *
 * Auth:
 *   POST {base}/auth/oauth2/token
 *   { client_id, client_secret, grant_type: "client_credentials" }
 *
 * Payments (USSD push — charge subscriber):
 *   POST {base}/simulate/merchant/v1/payments/
 *   Headers: Accept, Content-Type, X-Country: UG, X-Currency: UGX, Authorization: Bearer
 *   Body:
 *   {
 *     "reference": "Testing transaction",
 *     "subscriber": { "country": "UG", "currency": "UGX", "msisdn": "752601323" },
 *     "transaction": { "amount": "5000", "country": "UG", "currency": "UGX", "id": "TEST01" }
 *   }
 *
 * Enquiry:
 *   GET {base}/simulate/standard/v1/payments/{id}
 *
 * Server-side only.
 */

import { getAirtelConfig, hasAirtelCredentials } from "./config";

export type AirtelPayInput = {
  amount: number;
  currency?: string;
  phone: string;
  externalId: string;
  /** Shown on phone — Collection-API uses free text e.g. "Testing transaction" */
  reference?: string;
};

export type AirtelPayResult = {
  ok: boolean;
  referenceId?: string;
  transactionId?: string;
  status?: string;
  error?: string;
  demo?: boolean;
  live?: boolean;
  msisdn?: string;
  amount?: string;
  currency?: string;
  raw?: unknown;
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

/**
 * Airtel Collection msisdn: local without country code or leading 0
 * Collection-API sample: "752601323" (not 0752601323, not 256752601323)
 */
export function normalizeAirtelMsisdn(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("256")) p = p.slice(3);
  if (p.startsWith("0")) p = p.slice(1);
  return p;
}

export function normalizeAirtelInternational(phone: string): string {
  return `256${normalizeAirtelMsisdn(phone)}`;
}

/** Headers from Collection-API Payments / Enquiry requests */
function buildHeaders(accessToken: string): Record<string, string> {
  const cfg = getAirtelConfig();
  return {
    Accept: "*/*",
    "Content-Type": "application/json",
    "X-Country": cfg.country,
    "X-Currency": cfg.currency,
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Auth from Collection-API "Auth" request
 * POST https://openapi.airtel.ug/auth/oauth2/token
 */
type TokenResult = { token: string | null; error?: string };

async function getAccessToken(): Promise<TokenResult> {
  const cfg = getAirtelConfig();

  if (cfg.bearerToken) {
    return { token: cfg.bearerToken.replace(/^Bearer\s+/i, "").trim() };
  }

  if (!cfg.clientId || !cfg.clientSecret) {
    return { token: null, error: "Missing AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET" };
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return { token: tokenCache.token };
  }

  // Exact Auth request from Sandbox Collection-API's.json
  const url = `${cfg.baseUrl}${cfg.oauthPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const text = await res.text().catch(() => "");
  let data: {
    access_token?: string;
    expires_in?: number | string;
    error?: string;
    error_description?: string;
  } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* raw */
  }

  if (!res.ok) {
    console.error("Airtel OAuth failed", res.status, text);
    const desc =
      data.error_description ||
      data.error ||
      text ||
      `OAuth failed (${res.status})`;
    return {
      token: null,
      error:
        data.error === "invalid_client"
          ? "Invalid Airtel client_id/secret (generate new keys on developers.airtel.africa)"
          : String(desc),
    };
  }

  const token = data.access_token;
  if (!token) {
    return { token: null, error: "Airtel OAuth response missing access_token" };
  }

  const expiresIn = Number(data.expires_in || 3600);
  tokenCache = {
    token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };
  return { token };
}

/**
 * Unique transaction id for Collection-API (alphanumeric, short).
 * Sample uses "TEST01" / "abc123345"
 */
function buildTransactionId(externalId: string): string {
  const cleaned = externalId.replace(/[^a-zA-Z0-9]/g, "").slice(-20);
  const stamp = Date.now().toString(36).toUpperCase();
  return (cleaned || "PYU" + stamp).slice(0, 25);
}

/**
 * Payments V1/V2 — USSD push collection (charges the donor).
 * Matches Collection-API "Payments V1" / "Payments V2"
 */
export async function airtelRequestPayment(input: AirtelPayInput): Promise<AirtelPayResult> {
  const cfg = getAirtelConfig();
  const amountStr = String(Math.round(Number(input.amount)));
  const currency = (input.currency || cfg.currency).toUpperCase();
  const msisdn = normalizeAirtelMsisdn(input.phone);
  const transactionId = buildTransactionId(input.externalId);
  const reference = (input.reference || "PYU Donation").slice(0, 64);

  if (!amountStr || Number(amountStr) < 1) {
    return { ok: false, error: "Invalid amount" };
  }
  if (!msisdn || msisdn.length < 9) {
    return { ok: false, error: "Invalid Airtel phone number (use 07xx…)" };
  }

  if (!hasAirtelCredentials()) {
    return {
      ok: true,
      referenceId: `AIRTEL-DEMO-${Date.now()}`,
      transactionId,
      status: "PENDING",
      demo: true,
      live: false,
      msisdn: normalizeAirtelInternational(input.phone),
      amount: amountStr,
      currency,
    };
  }

  const auth = await getAccessToken();
  if (!auth.token) {
    return {
      ok: false,
      error:
        auth.error ||
        "Could not authenticate with Airtel. Check AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET.",
    };
  }

  // Exact body shape from Collection-API's.json (amount is a STRING)
  const body = {
    reference,
    subscriber: {
      country: cfg.country,
      currency,
      msisdn,
    },
    transaction: {
      amount: amountStr,
      country: cfg.country,
      currency,
      id: transactionId,
    },
  };

  const url = `${cfg.baseUrl}${cfg.collectionPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(auth.token),
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* keep empty */
  }

  if (!res.ok) {
    console.error("Airtel collection failed", res.status, text, { url, body });
    return {
      ok: false,
      error: extractAirtelError(json, text, res.status),
      raw: json,
      msisdn: normalizeAirtelInternational(input.phone),
      amount: amountStr,
      currency,
    };
  }

  // HTTP 200 can still contain business failure
  const statusCode = extractTxnStatus(json) || "PENDING";
  if (statusCode === "TF" || statusCode === "FAILED") {
    return {
      ok: false,
      error: extractAirtelError(json, text, res.status) || "Airtel payment failed",
      status: statusCode,
      raw: json,
      transactionId,
      referenceId: transactionId,
    };
  }

  return {
    ok: true,
    referenceId: transactionId,
    transactionId,
    status: mapAirtelStatus(statusCode),
    demo: false,
    live: true,
    msisdn: normalizeAirtelInternational(input.phone),
    amount: amountStr,
    currency,
    raw: json,
  };
}

/**
 * Enquiry V1/V2 — poll payment status
 * GET .../simulate/standard/v1/payments/{id}
 */
export async function getAirtelPaymentStatus(transactionId: string): Promise<{
  status: string;
  raw?: unknown;
  error?: string;
  message?: string;
  airtelCode?: string;
  airtelMoneyId?: string;
}> {
  if (!hasAirtelCredentials()) {
    return { status: "SUCCESSFUL", raw: { demo: true } };
  }

  if (!transactionId || transactionId.startsWith("AIRTEL-DEMO")) {
    return { status: "PENDING", error: "No live Airtel transaction id" };
  }

  const auth = await getAccessToken();
  if (!auth.token) return { status: "ERROR", error: auth.error || "Auth failed" };

  const cfg = getAirtelConfig();
  const url = `${cfg.baseUrl}${cfg.statusPath}/${encodeURIComponent(transactionId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(auth.token),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* raw */
  }

  if (!res.ok) {
    return {
      status: "ERROR",
      error: extractAirtelError(json, text, res.status),
      raw: json,
    };
  }

  const code = extractTxnStatus(json) || "UNKNOWN";
  const data = json.data as Record<string, unknown> | undefined;
  const txn = (data?.transaction || json.transaction) as Record<string, unknown> | undefined;
  const airtelMoneyId =
    (txn?.airtel_money_id as string) ||
    (txn?.airtel_money_id as string) ||
    (txn?.id as string);

  return {
    status: mapAirtelStatus(code),
    airtelCode: code,
    message: extractMessage(json),
    airtelMoneyId,
    raw: json,
  };
}

/**
 * Refund V1/V2 — optional admin helper
 * POST .../simulate/standard/v1/payments/refund
 * Body: { "transaction": { "airtel_money_id": "..." } }
 */
export async function airtelRefund(airtelMoneyId: string): Promise<{
  ok: boolean;
  error?: string;
  raw?: unknown;
}> {
  if (!hasAirtelCredentials()) {
    return { ok: false, error: "Airtel credentials not configured" };
  }
  const auth = await getAccessToken();
  if (!auth.token) return { ok: false, error: auth.error || "Auth failed" };

  const cfg = getAirtelConfig();
  const res = await fetch(`${cfg.baseUrl}${cfg.refundPath}`, {
    method: "POST",
    headers: buildHeaders(auth.token),
    body: JSON.stringify({
      transaction: { airtel_money_id: airtelMoneyId },
    }),
  });

  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* raw */
  }

  if (!res.ok) {
    return { ok: false, error: extractAirtelError(json, text, res.status), raw: json };
  }
  return { ok: true, raw: json };
}

function extractTxnStatus(json: Record<string, unknown>): string | undefined {
  const data = json.data as Record<string, unknown> | undefined;
  const txn = (data?.transaction || json.transaction) as
    | Record<string, unknown>
    | undefined;
  const status =
    (txn?.status as string) ||
    (typeof json.status === "string" ? json.status : undefined) ||
    (data && typeof data.status === "string" ? data.status : undefined);
  return status ? String(status).toUpperCase() : undefined;
}

function extractMessage(json: Record<string, unknown>): string | undefined {
  if (typeof json.message === "string") return json.message;
  const data = json.data as Record<string, unknown> | undefined;
  if (data && typeof data.message === "string") return data.message;
  const txn = data?.transaction as Record<string, unknown> | undefined;
  if (txn && typeof txn.message === "string") return txn.message;
  // status object shape: { status: { success, result_code, message } }
  const st = json.status as Record<string, unknown> | undefined;
  if (st && typeof st.message === "string") return st.message;
  return undefined;
}

function extractAirtelError(
  json: Record<string, unknown>,
  text: string,
  status: number
): string {
  const msg =
    extractMessage(json) ||
    (typeof json.error === "string" ? json.error : "") ||
    (json.error as { message?: string } | undefined)?.message ||
    text ||
    `Airtel request failed (${status})`;
  return String(msg).slice(0, 400);
}

/** Airtel codes: TS success, TIP in progress, TA ambiguous, TF failed */
export function mapAirtelStatus(code: string): string {
  const c = code.toUpperCase();
  if (["TS", "SUCCESS", "SUCCESSFUL", "COMPLETED"].includes(c)) return "SUCCESSFUL";
  if (["TF", "FAILED", "FAILURE", "DECLINED"].includes(c)) return "FAILED";
  if (["TIP", "TA", "PENDING", "IN_PROGRESS", "AMBIGUOUS"].includes(c)) return "PENDING";
  return c || "UNKNOWN";
}
