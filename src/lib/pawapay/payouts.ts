/**
 * PawaPay payouts — disburse merchant wallet → recipient MSISDN.
 *
 * POST /payouts (async)
 * Required fields (PawaPay docs):
 *   - payoutId      UUIDv4 you generate
 *   - amount        string amount to disburse
 *   - currency      ISO 4217 (e.g. UGX)
 *   - correspondent MMO code (e.g. AIRTEL_OAPI_UGA, MTN_MOMO_UGA)
 *   - recipient     { type: "MSISDN", address: { value: "2567..." } }
 *   - customerTimestamp
 *   - statementDescription (4–22 alphanumeric)
 *
 * Initiation status: ACCEPTED | ENQUEUED | REJECTED | DUPLICATE_IGNORED
 * Final status: poll GET /payouts/{payoutId} or callback → COMPLETED | FAILED
 */

import { randomUUID } from "crypto";
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
import {
  normalizePawaPayMsisdn,
  formatPawaPayAmount,
  type PawaPayGateway,
} from "./deposits";
import { getActiveConf, humanizePawaPayError } from "./active-conf";

export type PayoutInput = {
  payoutId?: string;
  amount: number;
  currency?: string;
  phone: string;
  gateway: PawaPayGateway;
  statementDescription?: string;
  metadata?: { fieldName: string; fieldValue: string; isPII?: boolean }[];
  /** When true, skip local active-conf gate and always POST /payouts */
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
  raw?: unknown;
};

export type PayoutStatusResult = {
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "ERROR";
  payoutId?: string;
  rawStatus?: string;
  reason?: string;
  error?: string;
  raw?: unknown;
};

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getPawaPayApiToken()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function correspondentForGateway(gateway: PawaPayGateway): string {
  if (gateway === "airtel_money") {
    return process.env.PAWAPAY_AIRTEL_CORRESPONDENT || PAWAPAY_AIRTEL_UGA;
  }
  return process.env.PAWAPAY_MTN_CORRESPONDENT || PAWAPAY_MTN_UGA;
}

function sanitizeStatement(text: string): string {
  const cleaned = text
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);
  if (cleaned.length >= 4) return cleaned;
  return "PYU Withdraw";
}

/**
 * POST /payouts — initiate disbursement.
 * PawaPay decides ACCEPTED / ENQUEUED / REJECTED.
 */
export async function initiatePayout(input: PayoutInput): Promise<PayoutResult> {
  const amountStr = formatPawaPayAmount(input.amount, input.gateway);
  const currency = (input.currency || getPawaPayCurrency()).toUpperCase();
  const msisdn = normalizePawaPayMsisdn(input.phone);
  const payoutId =
    input.payoutId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.payoutId
    )
      ? input.payoutId
      : randomUUID();
  const correspondent = correspondentForGateway(input.gateway);
  const country = getPawaPayCountry();

  if (!amountStr || Number(amountStr) < 1) {
    return { ok: false, error: "Invalid amount" };
  }
  if (Number(amountStr) < 500) {
    return { ok: false, error: "Minimum payout amount is UGX 500" };
  }
  if (Number(amountStr) > 5_000_000) {
    return { ok: false, error: "Maximum payout amount is UGX 5,000,000" };
  }
  if (!msisdn || msisdn.length < 11 || msisdn.length > 15) {
    return {
      ok: false,
      error: "Invalid recipient MSISDN (use e.g. 0752 123 456 → 256752123456)",
    };
  }

  if (!hasPawaPayCredentials()) {
    return {
      ok: false,
      error:
        "PawaPay is not configured. Set PAWAPAY_API_TOKEN on the server.",
      payoutId,
      msisdn,
      amount: amountStr,
      currency,
      correspondent,
      country,
    };
  }

  // Soft check only — still POST so PawaPay is the source of truth
  let confWarning: string | undefined;
  try {
    const conf = await getActiveConf(true);
    if (conf.ok) {
      const ops =
        conf.correspondents.find((c) => c.correspondent === correspondent)
          ?.operations || [];
      if (!ops.includes("PAYOUT")) {
        confWarning = `active-conf lists ${ops.join(", ") || "no ops"} for ${correspondent} (no PAYOUT). Still attempting POST /payouts.`;
        console.warn("[payout]", confWarning);
      }
    }
  } catch {
    /* ignore conf errors */
  }

  const safeMeta = (input.metadata || [])
    .filter((m) => m.fieldName && m.fieldValue)
    .slice(0, 5)
    .map((m) => ({
      fieldName:
        String(m.fieldName).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "meta",
      fieldValue: String(m.fieldValue).slice(0, 64),
      ...(m.isPII ? { isPII: true } : {}),
    }));

  // Official PawaPay payout body
  const body: Record<string, unknown> = {
    payoutId,
    amount: amountStr,
    currency,
    country,
    correspondent,
    recipient: {
      type: "MSISDN",
      address: { value: msisdn },
    },
    customerTimestamp: new Date().toISOString(),
    statementDescription: sanitizeStatement(
      input.statementDescription || "PYU Withdraw"
    ),
  };
  if (safeMeta.length) body.metadata = safeMeta;

  const url = `${getPawaPayBaseUrl()}/payouts`;
  console.info("[payout] POST", url, {
    payoutId,
    amount: amountStr,
    currency,
    country,
    correspondent,
    msisdn,
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

  if (!res.ok) {
    console.error("PawaPay payout HTTP error", res.status, text, {
      env: getPawaPayEnv(),
      msisdn,
      amount: amountStr,
      correspondent,
    });
    const msg =
      (json.errorMessage as string) ||
      (json.message as string) ||
      text ||
      `PawaPay payout failed (${res.status})`;
    return {
      ok: false,
      error: humanizePawaPayError(String(msg), input.gateway).slice(0, 600),
      rejectionCode: "HTTP_ERROR",
      payoutId,
      msisdn,
      amount: amountStr,
      currency,
      correspondent,
      country,
      raw: json,
    };
  }

  const status = String(json.status || "").toUpperCase();

  // REJECTED on initiation — not accepted for processing
  if (status === "REJECTED") {
    const reason = json.rejectionReason as
      | { rejectionCode?: string; rejectionMessage?: string }
      | undefined;
    const msg =
      reason?.rejectionMessage ||
      reason?.rejectionCode ||
      "Payout rejected by PawaPay";
    return {
      ok: false,
      error: `PawaPay: ${String(msg)}${confWarning ? ` (${confWarning})` : ""}`,
      payoutId: String(json.payoutId || payoutId),
      status: "REJECTED",
      rejectionCode: reason?.rejectionCode,
      msisdn,
      amount: amountStr,
      currency,
      correspondent,
      country,
      raw: json,
    };
  }

  // ACCEPTED | ENQUEUED | DUPLICATE_IGNORED → accepted for async processing
  return {
    ok: true,
    payoutId: String(json.payoutId || payoutId),
    status: status || "ACCEPTED",
    live: true,
    msisdn,
    amount: amountStr,
    currency,
    correspondent,
    country,
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
  // ACCEPTED, ENQUEUED, SUBMITTED, IN_RECONCILIATION → pending final callback
  return "PENDING";
}

/** GET /payouts/{payoutId} — poll until COMPLETED / FAILED */
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

  const url = `${getPawaPayBaseUrl()}/payouts/${encodeURIComponent(payoutId)}`;
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
    console.error("PawaPay payout status error", res.status, text);
    const errObj = json as { errorMessage?: string } | null;
    return {
      status: "ERROR",
      error:
        errObj?.errorMessage || text || `Status check failed (${res.status})`,
      payoutId,
      raw: json,
    };
  }

  // API may return array of at most one payout
  const list = Array.isArray(json) ? json : json ? [json] : [];
  if (list.length === 0) {
    return {
      status: "PENDING",
      payoutId,
      rawStatus: "NOT_FOUND_YET",
      error: "Payout not found yet",
      raw: json,
    };
  }

  const row = list[0] as {
    payoutId?: string;
    status?: string;
    failureReason?: { failureCode?: string; failureMessage?: string };
  };
  const rawStatus = String(row.status || "UNKNOWN").toUpperCase();
  const mapped = mapPayoutStatus(rawStatus);

  return {
    status: mapped,
    rawStatus,
    payoutId: row.payoutId || payoutId,
    reason:
      row.failureReason?.failureMessage ||
      row.failureReason?.failureCode ||
      undefined,
    raw: row,
  };
}

/** Poll a few times for final COMPLETED/FAILED after ACCEPTED/ENQUEUED */
export async function waitForPayoutResult(
  payoutId: string,
  opts?: { attempts?: number; delayMs?: number }
): Promise<PayoutStatusResult> {
  const attempts = opts?.attempts ?? 5;
  const delayMs = opts?.delayMs ?? 2000;
  let last: PayoutStatusResult = {
    status: "PENDING",
    payoutId,
  };
  for (let i = 0; i < attempts; i++) {
    last = await getPayoutStatus(payoutId);
    if (last.status === "SUCCESSFUL" || last.status === "FAILED") return last;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return last;
}

/** Fetch merchant wallet balances (optional display). */
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

  const country = getPawaPayCountry();
  const candidates = [
    `${getPawaPayBaseUrl()}/v1/wallet-balances/${country}`,
    `${getPawaPayBaseUrl()}/wallet-balances/${country}`,
    `${getPawaPayBaseUrl()}/v2/wallet-balances?country=${country}`,
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
              mno: row.mno || row.correspondent || row.ownerName,
            };
          }),
          raw: json,
        };
      }
    } catch {
      /* try next */
    }
  }

  return { ok: false, balances: [], error: "Could not load wallet balances" };
}
