/**
 * PawaPay /active-conf — which MMOs and operations (DEPOSIT / PAYOUT / REFUND)
 * are enabled for this merchant token.
 */

import {
  getPawaPayBaseUrl,
  getPawaPayApiToken,
  hasPawaPayCredentials,
  PAWAPAY_AIRTEL_UGA,
  PAWAPAY_MTN_UGA,
} from "./config";
import type { PawaPayGateway } from "./deposits";

export type PawaPayOperation = "DEPOSIT" | "PAYOUT" | "REFUND" | string;

export type CorrespondentOps = {
  correspondent: string;
  currency: string;
  country: string;
  ownerName?: string;
  operations: PawaPayOperation[];
  depositMin?: number;
  depositMax?: number;
  payoutMin?: number;
  payoutMax?: number;
};

export type ActiveConfSummary = {
  ok: boolean;
  merchantId?: string;
  merchantName?: string;
  correspondents: CorrespondentOps[];
  /** True if any MMO supports PAYOUT */
  payoutsEnabled: boolean;
  airtelPayout: boolean;
  mtnPayout: boolean;
  airtelDeposit: boolean;
  mtnDeposit: boolean;
  error?: string;
  raw?: unknown;
};

let cache: { at: number; data: ActiveConfSummary } | null = null;
const CACHE_MS = 60_000;

function opsFrom(
  country: string,
  c: {
    correspondent?: string;
    currency?: string;
    ownerName?: string;
    operationTypes?: Array<{
      operationType?: string;
      minTransactionLimit?: string;
      maxTransactionLimit?: string;
    }>;
  }
): CorrespondentOps {
  const operations = (c.operationTypes || []).map((o) =>
    String(o.operationType || "").toUpperCase()
  );
  const findLim = (type: string) =>
    (c.operationTypes || []).find(
      (o) => String(o.operationType || "").toUpperCase() === type
    );

  const dep = findLim("DEPOSIT");
  const pay = findLim("PAYOUT");

  return {
    correspondent: String(c.correspondent || ""),
    currency: String(c.currency || "UGX"),
    country,
    ownerName: c.ownerName,
    operations,
    depositMin: dep?.minTransactionLimit
      ? Number(dep.minTransactionLimit)
      : undefined,
    depositMax: dep?.maxTransactionLimit
      ? Number(dep.maxTransactionLimit)
      : undefined,
    payoutMin: pay?.minTransactionLimit
      ? Number(pay.minTransactionLimit)
      : undefined,
    payoutMax: pay?.maxTransactionLimit
      ? Number(pay.maxTransactionLimit)
      : undefined,
  };
}

export async function getActiveConf(
  force = false
): Promise<ActiveConfSummary> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  if (!hasPawaPayCredentials()) {
    const empty: ActiveConfSummary = {
      ok: false,
      correspondents: [],
      payoutsEnabled: false,
      airtelPayout: false,
      mtnPayout: false,
      airtelDeposit: false,
      mtnDeposit: false,
      error: "PAWAPAY_API_TOKEN not set",
    };
    return empty;
  }

  try {
    const res = await fetch(`${getPawaPayBaseUrl()}/active-conf`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getPawaPayApiToken()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      const err: ActiveConfSummary = {
        ok: false,
        correspondents: [],
        payoutsEnabled: false,
        airtelPayout: false,
        mtnPayout: false,
        airtelDeposit: false,
        mtnDeposit: false,
        error: `active-conf failed (${res.status})`,
        raw,
      };
      return err;
    }

    const data = raw as {
      merchantId?: string;
      merchantName?: string;
      countries?: Array<{
        country?: string;
        correspondents?: Array<{
          correspondent?: string;
          currency?: string;
          ownerName?: string;
          operationTypes?: Array<{
            operationType?: string;
            minTransactionLimit?: string;
            maxTransactionLimit?: string;
          }>;
        }>;
      }>;
    };

    const correspondents: CorrespondentOps[] = [];
    for (const country of data.countries || []) {
      const code = String(country.country || "UGA");
      for (const c of country.correspondents || []) {
        correspondents.push(opsFrom(code, c));
      }
    }

    const hasOp = (corr: string, op: string) =>
      correspondents.some(
        (c) =>
          c.correspondent.toUpperCase() === corr.toUpperCase() &&
          c.operations.includes(op)
      );

    const summary: ActiveConfSummary = {
      ok: true,
      merchantId: data.merchantId,
      merchantName: data.merchantName,
      correspondents,
      airtelDeposit: hasOp(PAWAPAY_AIRTEL_UGA, "DEPOSIT"),
      mtnDeposit: hasOp(PAWAPAY_MTN_UGA, "DEPOSIT"),
      airtelPayout: hasOp(PAWAPAY_AIRTEL_UGA, "PAYOUT"),
      mtnPayout: hasOp(PAWAPAY_MTN_UGA, "PAYOUT"),
      payoutsEnabled:
        hasOp(PAWAPAY_AIRTEL_UGA, "PAYOUT") ||
        hasOp(PAWAPAY_MTN_UGA, "PAYOUT"),
      raw,
    };

    cache = { at: Date.now(), data: summary };
    return summary;
  } catch (e) {
    return {
      ok: false,
      correspondents: [],
      payoutsEnabled: false,
      airtelPayout: false,
      mtnPayout: false,
      airtelDeposit: false,
      mtnDeposit: false,
      error: e instanceof Error ? e.message : "active-conf error",
    };
  }
}

export function gatewaySupportsPayout(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): boolean {
  return gateway === "airtel_money" ? conf.airtelPayout : conf.mtnPayout;
}

export function gatewaySupportsDeposit(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): boolean {
  return gateway === "airtel_money" ? conf.airtelDeposit : conf.mtnDeposit;
}

/** Human message when PAYOUT is not on the merchant account */
export function payoutNotConfiguredMessage(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): string {
  const network = gateway === "airtel_money" ? "Airtel Money" : "MTN MoMo";
  const code =
    gateway === "airtel_money" ? "AIRTEL_OAPI_UGA" : "MTN_MOMO_UGA";
  const ops =
    conf.correspondents.find((c) => c.correspondent === code)?.operations ||
    [];
  const enabled = ops.length ? ops.join(", ") : "none listed";

  return (
    `PawaPay has no PAYOUT flow for ${network} (${code}/UGA/UGX). ` +
    `Your merchant account currently allows: ${enabled}. ` +
    `Deposits (receiving money) work; withdrawals need PAYOUT enabled. ` +
    `Open the live PawaPay dashboard → contact support / account manager and ask to enable ` +
    `PAYOUT for Uganda ${network} (UGX). Merchant: ${conf.merchantName || conf.merchantId || "unknown"}.`
  );
}

/** Map raw PawaPay API errors to clearer text */
export function humanizePawaPayError(raw: string, gateway?: PawaPayGateway): string {
  const s = String(raw || "");
  const lower = s.toLowerCase();
  if (
    lower.includes("no active flow") ||
    lower.includes("active flow configuration") ||
    lower.includes("no_active") ||
    lower.includes("flow configuration")
  ) {
    const net =
      gateway === "mtn_momo"
        ? "MTN MoMo"
        : gateway === "airtel_money"
          ? "Airtel Money"
          : "this network";
    return (
      `PawaPay rejected the request: no active flow for ${net} (UGA/UGX). ` +
      `Usually this means PAYOUT (withdraw) is not enabled on your merchant account — only DEPOSIT/REFUND may be active. ` +
      `Ask PawaPay support to enable PAYOUT for Uganda Airtel and MTN. Original: ${s.slice(0, 160)}`
    );
  }
  if (lower.includes("balance_insufficient") || lower.includes("insufficient")) {
    return (
      `PawaPay wallet balance is too low for this payout. ` +
      `Check your live PawaPay dashboard wallet. Original: ${s.slice(0, 120)}`
    );
  }
  return s;
}
