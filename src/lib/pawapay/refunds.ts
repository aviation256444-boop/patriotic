/**
 * PawaPay refunds — POST /refunds · GET /refunds/{refundId}
 *
 * PawaPay decides eligibility (deposit completed, already refunded, amount, etc.).
 * We only need a deposit UUID. Amount is optional (omit = full deposit refund).
 */

import { randomUUID } from "crypto";
import {
  getPawaPayBaseUrl,
  getPawaPayApiToken,
  hasPawaPayCredentials,
  getPawaPayEnv,
} from "./config";
import { humanizePawaPayError } from "./active-conf";

export type RefundInput = {
  refundId?: string;
  /** Original PawaPay deposit UUID */
  depositId: string;
  /** Optional partial amount; omit for full refund of the deposit */
  amount?: number;
  /** Gateway hint for amount decimals (mtn uses 2 places). Omit amount when unsure. */
  gateway?: "mtn_momo" | "airtel_money" | "auto";
  /** When true, do not send amount — let PawaPay fully refund the deposit */
  fullRefund?: boolean;
  metadata?: { fieldName: string; fieldValue: string; isPII?: boolean }[];
};

export type RefundResult = {
  ok: boolean;
  refundId?: string;
  depositId?: string;
  status?: string;
  error?: string;
  rejectionCode?: string;
  amount?: string;
  live?: boolean;
  raw?: unknown;
};

export type RefundStatusResult = {
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "ERROR";
  refundId?: string;
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

/** Prefer simple integer UGX for refunds (works for Airtel; MTN often accepts too). */
function formatRefundAmount(
  amount: number,
  gateway?: "mtn_momo" | "airtel_money" | "auto"
): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n < 1) return "";
  if (gateway === "mtn_momo") return n.toFixed(2);
  return String(n);
}

export async function initiateRefund(input: RefundInput): Promise<RefundResult> {
  const depositId = String(input.depositId || "").trim();
  const refundId =
    input.refundId && /^[0-9a-f-]{36}$/i.test(input.refundId)
      ? input.refundId
      : randomUUID();

  if (!depositId || !/^[0-9a-f-]{36}$/i.test(depositId)) {
    return {
      ok: false,
      error:
        "Need a valid PawaPay deposit ID (UUID). Find it on your payment receipt or PawaPay dashboard Deposits.",
      depositId,
      refundId,
    };
  }

  if (!hasPawaPayCredentials()) {
    return {
      ok: false,
      error: "PawaPay token not configured on the server",
      depositId,
      refundId,
    };
  }

  const body: Record<string, unknown> = {
    refundId,
    depositId,
  };

  // Only attach amount for partial refunds. Full refund = omit amount (PawaPay decides).
  const wantFull =
    input.fullRefund === true ||
    input.amount == null ||
    !Number.isFinite(Number(input.amount)) ||
    Number(input.amount) <= 0;

  if (!wantFull) {
    const amountStr = formatRefundAmount(Number(input.amount), input.gateway || "auto");
    if (amountStr) body.amount = amountStr;
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
  if (safeMeta.length) body.metadata = safeMeta;

  const url = `${getPawaPayBaseUrl()}/refunds`;
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
    console.error("PawaPay refund HTTP error", res.status, text, {
      env: getPawaPayEnv(),
      depositId,
      body,
    });
    const msg =
      (json.errorMessage as string) ||
      (json.message as string) ||
      text ||
      `Refund failed (${res.status})`;
    return {
      ok: false,
      error: humanizePawaPayError(String(msg)).slice(0, 600),
      refundId,
      depositId,
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
      "Refund rejected by PawaPay";
    // Pass through PawaPay reason clearly (ALREADY_REFUNDED, DEPOSIT_NOT_FOUND, etc.)
    return {
      ok: false,
      error: `PawaPay: ${String(msg)}`,
      refundId: String(json.refundId || refundId),
      depositId,
      status: "REJECTED",
      rejectionCode: reason?.rejectionCode,
      raw: json,
    };
  }

  return {
    ok: true,
    refundId: String(json.refundId || refundId),
    depositId,
    status: status || "ACCEPTED",
    live: true,
    amount: body.amount ? String(body.amount) : undefined,
    raw: json,
  };
}

export function mapRefundStatus(
  status: string
): "SUCCESSFUL" | "FAILED" | "PENDING" {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESSFUL" || s === "SUCCESS")
    return "SUCCESSFUL";
  if (s === "FAILED" || s === "REJECTED" || s === "CANCELLED" || s === "CANCELED")
    return "FAILED";
  return "PENDING";
}

export async function getRefundStatus(
  refundId: string
): Promise<RefundStatusResult> {
  if (!hasPawaPayCredentials()) {
    return { status: "ERROR", error: "No PawaPay token", refundId };
  }
  if (!refundId) return { status: "ERROR", error: "Missing refundId" };

  const url = `${getPawaPayBaseUrl()}/refunds/${encodeURIComponent(refundId)}`;
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
    const errObj = json as { errorMessage?: string } | null;
    return {
      status: "ERROR",
      error: errObj?.errorMessage || text || `Status failed (${res.status})`,
      refundId,
      raw: json,
    };
  }

  const list = Array.isArray(json) ? json : json ? [json] : [];
  if (list.length === 0) {
    return { status: "PENDING", refundId, error: "Refund not found yet", raw: json };
  }

  const row = list[0] as {
    refundId?: string;
    status?: string;
    failureReason?: { failureCode?: string; failureMessage?: string };
  };
  const mapped = mapRefundStatus(String(row.status || "UNKNOWN"));

  return {
    status: mapped,
    refundId: row.refundId || refundId,
    reason:
      row.failureReason?.failureMessage ||
      row.failureReason?.failureCode ||
      undefined,
    raw: row,
  };
}
