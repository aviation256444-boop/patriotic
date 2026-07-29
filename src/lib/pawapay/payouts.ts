/**
 * PawaPay PAYOUTS — API v2 (as specified by PawaPay support)
 *
 * POST {base}/v2/payouts
 * {
 *   "payoutId": "<uuid>",
 *   "amount": "100",
 *   "currency": "UGX",
 *   "recipient": {
 *     "type": "MMO",
 *     "accountDetails": {
 *       "phoneNumber": "2567XXXXXXXX",
 *       "provider": "MTN_MOMO_UGA" | "AIRTEL_OAPI_UGA"
 *     }
 *   },
 *   "customerMessage": "PYU Withdraw"   // optional, 4–22 alnum
 * }
 *
 * GET {base}/v2/payouts/{payoutId}
 * → { status: "FOUND", data: { status: "COMPLETED"|... } } | { status: "NOT_FOUND" }
 *
 * Docs: https://docs.pawapay.io/v2/api-reference/payouts/initiate-payout
 */

import { randomUUID } from "crypto";
import {
  getPawaPayBaseUrl,
  getPawaPayApiToken,
  getPawaPayCurrency,
  hasPawaPayCredentials,
  PAWAPAY_MTN_UGA,
  PAWAPAY_AIRTEL_UGA,
  getPawaPayEnv,
} from "./config";
import { normalizePawaPayMsisdn, type PawaPayGateway } from "./deposits";
import { humanizePawaPayError } from "./active-conf";

export type PayoutInput = {
  payoutId?: string;
  amount: number;
  currency?: string;
  phone: string;
  gateway: PawaPayGateway;
  statementDescription?: string;
  clientReferenceId?: string;
  metadata?: { fieldName: string; fieldValue: string; isPII?: boolean }[];
  forceAttempt?: boolean;
};

export type PayoutResult = {
  ok: boolean;
  payoutId?: string;
  status?: string;
  error?: string;
  rejectionCode?: string;
  msisdn?: string;
  amount?: string;
  currency?: string;
  correspondent?: string;
  country?: string;
  live?: boolean;
  apiVersion?: "v2";
  raw?: unknown;
};

export type PayoutStatusResult = {
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "ERROR";
  payoutId?: string;
  rawStatus?: string;
  reason?: string;
  error?: string;
  amount?: string;
  currency?: string;
  country?: string;
  correspondent?: string;
  msisdn?: string;
  created?: string;
  receivedByRecipient?: string;
  failureCode?: string;
  raw?: unknown;
};

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getPawaPayApiToken()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Provider code for v2 recipient.accountDetails.provider */
export function correspondentForGateway(gateway: PawaPayGateway): string {
  if (gateway === "airtel_money") {
    return process.env.PAWAPAY_AIRTEL_CORRESPONDENT || PAWAPAY_AIRTEL_UGA;
  }
  return process.env.PAWAPAY_MTN_CORRESPONDENT || PAWAPAY_MTN_UGA;
}

export const providerForGateway = correspondentForGateway;

/** UGX amounts: integer string (Airtel has no decimals; safe for both) */
function formatPayoutAmount(amount: number, gateway: PawaPayGateway): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n < 1) return "";
  // MTN UGA historically allowed 2 decimals; integer is accepted for both
  if (gateway === "mtn_momo" && process.env.PAWAPAY_MTN_AMOUNT_DECIMALS === "2") {
    return n.toFixed(2);
  }
  return String(n);
}

function sanitizeCustomerMessage(text: string): string {
  const cleaned = text
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);
  if (cleaned.length >= 4) return cleaned;
  return "PYU Withdraw";
}

/**
 * POST /v2/payouts — initiate disbursement to any MSISDN you choose.
 */
export async function initiatePayout(input: PayoutInput): Promise<PayoutResult> {
  const amountStr = formatPayoutAmount(input.amount, input.gateway);
  const currency = (input.currency || getPawaPayCurrency()).toUpperCase();
  const phoneNumber = normalizePawaPayMsisdn(input.phone);
  const payoutId =
    input.payoutId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.payoutId
    )
      ? input.payoutId
      : randomUUID();
  const provider = providerForGateway(input.gateway);

  if (!amountStr || Number(amountStr) < 500) {
    return { ok: false, error: "Minimum payout amount is UGX 500" };
  }
  if (Number(amountStr) > 5_000_000) {
    return { ok: false, error: "Maximum payout amount is UGX 5,000,000" };
  }
  if (!phoneNumber || phoneNumber.length < 11 || phoneNumber.length > 15) {
    return {
      ok: false,
      error:
        "Invalid phoneNumber. Use digits with country code, e.g. 2567XXXXXXXX (no + or spaces).",
    };
  }
  if (phoneNumber.startsWith("0")) {
    return {
      ok: false,
      error: "phoneNumber must not start with 0 — use 256… format",
    };
  }

  if (!hasPawaPayCredentials()) {
    return {
      ok: false,
      error: "PawaPay is not configured. Set PAWAPAY_API_TOKEN on the server.",
      payoutId,
      msisdn: phoneNumber,
      amount: amountStr,
      currency,
      correspondent: provider,
    };
  }

  // Exact minimal shape from PawaPay support (UGX + MTN/Airtel):
  // { payoutId, amount, currency, recipient: { type: "MMO", accountDetails: { phoneNumber, provider } } }
  const body: Record<string, unknown> = {
    payoutId,
    amount: amountStr,
    currency,
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber,
        provider,
      },
    },
  };

  // Optional fields (safe; omitted from minimal support example)
  if (input.statementDescription) {
    body.customerMessage = sanitizeCustomerMessage(input.statementDescription);
  }
  if (input.clientReferenceId) {
    body.clientReferenceId = String(input.clientReferenceId).slice(0, 64);
  }

  const url = `${getPawaPayBaseUrl()}/v2/payouts`;
  console.info("[payout-v2] POST", url, {
    payoutId,
    amount: amountStr,
    currency,
    provider,
    phoneNumber,
    env: getPawaPayEnv(),
  });

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

  const failureReason = (json.failureReason || {}) as {
    failureCode?: string;
    failureMessage?: string;
  };
  // Some responses nest failure under status REJECTED
  const failCode = failureReason.failureCode;
  const failMsg = failureReason.failureMessage;

  if (!res.ok) {
    console.error("PawaPay v2 payout HTTP error", res.status, text, {
      env: getPawaPayEnv(),
      phoneNumber,
      amount: amountStr,
      provider,
    });
    const msg =
      failMsg ||
      (json.errorMessage as string) ||
      (json.message as string) ||
      text ||
      `PawaPay payout failed (${res.status})`;
    return {
      ok: false,
      error: humanizePawaPayError(String(msg), input.gateway).slice(0, 600),
      rejectionCode: failCode || "HTTP_ERROR",
      payoutId: String(json.payoutId || payoutId),
      msisdn: phoneNumber,
      amount: amountStr,
      currency,
      correspondent: provider,
      apiVersion: "v2",
      raw: json,
    };
  }

  const status = String(json.status || "").toUpperCase();

  if (status === "REJECTED") {
    let msg = failMsg || failCode || "Payout rejected by PawaPay";
    if (
      failCode === "PAYOUTS_NOT_ALLOWED" ||
      String(msg).toLowerCase().includes("not been configured to make payouts") ||
      String(msg).toLowerCase().includes("payouts_not_allowed")
    ) {
      msg =
        `Payouts are NOT enabled on this PawaPay merchant for provider ${provider}. ` +
        `Your API payload is correct (v2). Email support@pawapay.io and ask them to ` +
        `enable PAYOUT for ${provider} (and AIRTEL_OAPI_UGA / MTN_MOMO_UGA) on your ` +
        `LIVE account — not only send code examples. ` +
        `PawaPay said: ${failMsg || failCode}`;
    }
    return {
      ok: false,
      error: msg,
      payoutId: String(json.payoutId || payoutId),
      status: "REJECTED",
      rejectionCode: failCode,
      msisdn: phoneNumber,
      amount: amountStr,
      currency,
      correspondent: provider,
      apiVersion: "v2",
      raw: json,
    };
  }

  // ACCEPTED | DUPLICATE_IGNORED
  return {
    ok: true,
    payoutId: String(json.payoutId || payoutId),
    status: status || "ACCEPTED",
    live: true,
    msisdn: phoneNumber,
    amount: amountStr,
    currency,
    correspondent: provider,
    apiVersion: "v2",
    raw: json,
  };
}

export function mapPayoutStatus(
  status: string
): "SUCCESSFUL" | "FAILED" | "PENDING" {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESSFUL" || s === "SUCCESS")
    return "SUCCESSFUL";
  if (
    s === "FAILED" ||
    s === "REJECTED" ||
    s === "CANCELLED" ||
    s === "CANCELED" ||
    s === "EXPIRED"
  )
    return "FAILED";
  // ACCEPTED, ENQUEUED, PROCESSING, IN_RECONCILIATION, SUBMITTED
  return "PENDING";
}

/** GET /v2/payouts/{payoutId} */
export async function getPayoutStatus(
  payoutId: string
): Promise<PayoutStatusResult> {
  if (!hasPawaPayCredentials()) {
    return {
      status: "ERROR",
      error: "PawaPay API token not configured",
      payoutId,
    };
  }
  if (!payoutId) {
    return { status: "ERROR", error: "Missing payoutId" };
  }

  const url = `${getPawaPayBaseUrl()}/v2/payouts/${encodeURIComponent(payoutId)}`;
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
    console.error("PawaPay v2 payout status error", res.status, text);
    const errObj = json as {
      errorMessage?: string;
      failureReason?: { failureMessage?: string };
    } | null;
    return {
      status: "ERROR",
      error:
        errObj?.failureReason?.failureMessage ||
        errObj?.errorMessage ||
        text ||
        `Status check failed (${res.status})`,
      payoutId,
      raw: json,
    };
  }

  const root = json as {
    status?: string;
    data?: Record<string, unknown>;
  } | null;

  // v2: { status: "FOUND"|"NOT_FOUND", data?: Payout }
  // also tolerate v1 array form
  if (root && root.status === "NOT_FOUND") {
    return {
      status: "PENDING",
      payoutId,
      rawStatus: "NOT_FOUND",
      error: "Payout not found in PawaPay (check payoutId and environment)",
      raw: json,
    };
  }

  let row: Record<string, unknown> | null = null;
  if (root?.status === "FOUND" && root.data) {
    row = root.data;
  } else if (Array.isArray(json) && json[0]) {
    row = json[0] as Record<string, unknown>;
  } else if (root && root.data) {
    row = root.data;
  } else if (root && typeof root.status === "string" && root.status !== "FOUND") {
    // direct payout object
    row = root as unknown as Record<string, unknown>;
  }

  if (!row) {
    return {
      status: "PENDING",
      payoutId,
      rawStatus: "UNKNOWN",
      error: "Unexpected payout status response shape",
      raw: json,
    };
  }

  const rawStatus = String(row.status || "UNKNOWN").toUpperCase();
  const mapped = mapPayoutStatus(rawStatus);
  const failureReason = row.failureReason as
    | { failureCode?: string; failureMessage?: string }
    | undefined;
  const recipient = row.recipient as
    | {
        accountDetails?: { phoneNumber?: string; provider?: string };
        address?: { value?: string };
      }
    | undefined;

  return {
    status: mapped,
    rawStatus,
    payoutId: String(row.payoutId || payoutId),
    amount: row.amount != null ? String(row.amount) : undefined,
    currency: row.currency != null ? String(row.currency) : undefined,
    country: row.country != null ? String(row.country) : undefined,
    correspondent:
      recipient?.accountDetails?.provider != null
        ? String(recipient.accountDetails.provider)
        : row.correspondent != null
          ? String(row.correspondent)
          : undefined,
    msisdn:
      recipient?.accountDetails?.phoneNumber ||
      recipient?.address?.value ||
      undefined,
    created: row.created != null ? String(row.created) : undefined,
    failureCode: failureReason?.failureCode,
    reason: failureReason?.failureMessage || failureReason?.failureCode,
    raw: row,
  };
}

export async function waitForPayoutResult(
  payoutId: string,
  opts?: { attempts?: number; delayMs?: number }
): Promise<PayoutStatusResult> {
  const attempts = opts?.attempts ?? 6;
  const delayMs = opts?.delayMs ?? 1500;
  let last: PayoutStatusResult = { status: "PENDING", payoutId };
  for (let i = 0; i < attempts; i++) {
    last = await getPayoutStatus(payoutId);
    if (last.status === "SUCCESSFUL" || last.status === "FAILED") return last;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return last;
}

export async function getWalletBalances(): Promise<{
  ok: boolean;
  balances: Array<{
    country?: string;
    balance?: string;
    currency?: string;
    mno?: string;
  }>;
  error?: string;
  raw?: unknown;
}> {
  if (!hasPawaPayCredentials()) {
    return { ok: false, balances: [], error: "No PawaPay token" };
  }

  const base = getPawaPayBaseUrl();
  const candidates = [
    `${base}/v2/wallet-balances`,
    `${base}/v1/wallet-balances/UGA`,
    `${base}/wallet-balances/UGA`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json().catch(() => null)) as
        | { balances?: Array<Record<string, string>> }
        | Array<Record<string, string>>
        | null;
      const balances = Array.isArray(json)
        ? json
        : Array.isArray(json?.balances)
          ? json!.balances!
          : [];
      if (balances.length || res.ok) {
        return {
          ok: true,
          balances: balances.map((b) => {
            const row = b as Record<string, string>;
            return {
              country: row.country,
              balance: row.balance,
              currency: row.currency,
              mno: row.mno || row.correspondent || row.provider || row.ownerName,
            };
          }),
          raw: json,
        };
      }
    } catch {
      /* next */
    }
  }

  return { ok: false, balances: [], error: "Could not load wallet balances" };
}
