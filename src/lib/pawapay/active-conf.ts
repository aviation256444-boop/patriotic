/**
 * PawaPay active configuration — v2 preferred.
 *
 * GET /v2/active-conf?country=UGA
 * GET /v2/active-conf?country=UGA&operationType=PAYOUT
 *
 * Uganda (market rules from PawaPay support, 2026):
 * - MTN_MOMO_UGA  → PAYOUT can be supported
 * - AIRTEL_OAPI_UGA → PAYOUT not supported for this correspondent
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
  displayName?: string;
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
  /** Providers that have PAYOUT in conf (or returned by operationType=PAYOUT) */
  payoutProviders: string[];
  payoutsEnabled: boolean;
  airtelPayout: boolean;
  mtnPayout: boolean;
  airtelDeposit: boolean;
  mtnDeposit: boolean;
  /** Market rule: Airtel UGA cannot do payouts */
  airtelPayoutMarketSupported: boolean;
  mtnPayoutMarketSupported: boolean;
  error?: string;
  raw?: unknown;
  rawPayoutConf?: unknown;
};

let cache: { at: number; data: ActiveConfSummary } | null = null;
const CACHE_MS = 45_000;

/** Uganda market: PawaPay says Airtel payouts are not available */
export const UGA_AIRTEL_PAYOUT_SUPPORTED = false;
export const UGA_MTN_PAYOUT_SUPPORTED = true;

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getPawaPayApiToken()}`,
    Accept: "application/json",
  };
}

type V2Provider = {
  provider?: string;
  displayName?: string;
  nameDisplayedToCustomer?: string;
  currencies?: Array<{
    currency?: string;
    operationTypes?: Record<
      string,
      {
        minAmount?: string;
        maxAmount?: string;
        status?: string;
      }
    >;
  }>;
};

function parseV2Countries(raw: unknown): CorrespondentOps[] {
  const data = raw as {
    companyName?: string;
    countries?: Array<{
      country?: string;
      providers?: V2Provider[];
    }>;
  };
  const out: CorrespondentOps[] = [];
  for (const c of data.countries || []) {
    const country = String(c.country || "UGA");
    for (const p of c.providers || []) {
      const provider = String(p.provider || "");
      if (!provider) continue;
      const cur = p.currencies?.[0];
      const opsMap = cur?.operationTypes || {};
      const operations = Object.keys(opsMap).map((k) => k.toUpperCase());
      const dep = opsMap.DEPOSIT || opsMap.deposit;
      const pay = opsMap.PAYOUT || opsMap.payout;
      out.push({
        correspondent: provider,
        currency: String(cur?.currency || "UGX"),
        country,
        ownerName: p.nameDisplayedToCustomer,
        displayName: p.displayName,
        operations,
        depositMin: dep?.minAmount ? Number(dep.minAmount) : undefined,
        depositMax: dep?.maxAmount ? Number(dep.maxAmount) : undefined,
        payoutMin: pay?.minAmount ? Number(pay.minAmount) : undefined,
        payoutMax: pay?.maxAmount ? Number(pay.maxAmount) : undefined,
      });
    }
  }
  return out;
}

/** Parse older v1 active-conf shape */
function parseV1(raw: unknown): {
  merchantName?: string;
  merchantId?: string;
  correspondents: CorrespondentOps[];
} {
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
      const operations = (c.operationTypes || []).map((o) =>
        String(o.operationType || "").toUpperCase()
      );
      const findLim = (type: string) =>
        (c.operationTypes || []).find(
          (o) => String(o.operationType || "").toUpperCase() === type
        );
      const dep = findLim("DEPOSIT");
      const pay = findLim("PAYOUT");
      correspondents.push({
        correspondent: String(c.correspondent || ""),
        currency: String(c.currency || "UGX"),
        country: code,
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
      });
    }
  }
  return {
    merchantId: data.merchantId,
    merchantName: data.merchantName,
    correspondents,
  };
}

export async function getActiveConf(
  force = false
): Promise<ActiveConfSummary> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  if (!hasPawaPayCredentials()) {
    return {
      ok: false,
      correspondents: [],
      payoutProviders: [],
      payoutsEnabled: false,
      airtelPayout: false,
      mtnPayout: false,
      airtelDeposit: false,
      mtnDeposit: false,
      airtelPayoutMarketSupported: UGA_AIRTEL_PAYOUT_SUPPORTED,
      mtnPayoutMarketSupported: UGA_MTN_PAYOUT_SUPPORTED,
      error: "PAWAPAY_API_TOKEN not set",
    };
  }

  const base = getPawaPayBaseUrl();
  let rawAll: unknown = null;
  let rawPayout: unknown = null;
  let merchantName: string | undefined;
  let merchantId: string | undefined;
  let correspondents: CorrespondentOps[] = [];

  try {
    // v2 full conf
    const r1 = await fetch(`${base}/v2/active-conf?country=UGA`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (r1.ok) {
      rawAll = await r1.json().catch(() => null);
      if (rawAll) {
        merchantName = (rawAll as { companyName?: string }).companyName;
        correspondents = parseV2Countries(rawAll);
      }
    }

    // v2 payout-only filter (what support recommended)
    const r2 = await fetch(
      `${base}/v2/active-conf?country=UGA&operationType=PAYOUT`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (r2.ok) {
      rawPayout = await r2.json().catch(() => null);
    }

    // Fallback v1
    if (correspondents.length === 0) {
      const r3 = await fetch(`${base}/active-conf`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (r3.ok) {
        rawAll = await r3.json().catch(() => null);
        const v1 = parseV1(rawAll);
        merchantId = v1.merchantId;
        merchantName = merchantName || v1.merchantName;
        correspondents = v1.correspondents;
      }
    }
  } catch (e) {
    return {
      ok: false,
      correspondents: [],
      payoutProviders: [],
      payoutsEnabled: false,
      airtelPayout: false,
      mtnPayout: false,
      airtelDeposit: false,
      mtnDeposit: false,
      airtelPayoutMarketSupported: UGA_AIRTEL_PAYOUT_SUPPORTED,
      mtnPayoutMarketSupported: UGA_MTN_PAYOUT_SUPPORTED,
      error: e instanceof Error ? e.message : "active-conf error",
    };
  }

  const hasOp = (corr: string, op: string) =>
    correspondents.some(
      (c) =>
        c.correspondent.toUpperCase() === corr.toUpperCase() &&
        c.operations.includes(op)
    );

  // Providers listed under operationType=PAYOUT filter
  const payoutProvidersFromFilter: string[] = [];
  if (rawPayout) {
    const payoutParsed = parseV2Countries(rawPayout);
    for (const p of payoutParsed) {
      if (p.correspondent) payoutProvidersFromFilter.push(p.correspondent);
    }
  }

  // Also any provider that has PAYOUT in full conf
  const payoutFromOps = correspondents
    .filter((c) => c.operations.includes("PAYOUT"))
    .map((c) => c.correspondent);

  const payoutProviders = Array.from(
    new Set([...payoutProvidersFromFilter, ...payoutFromOps])
  );

  // Account-level: listed in conf
  let mtnPayout =
    payoutProviders.some((p) => p === PAWAPAY_MTN_UGA) ||
    hasOp(PAWAPAY_MTN_UGA, "PAYOUT");
  let airtelPayout =
    payoutProviders.some((p) => p === PAWAPAY_AIRTEL_UGA) ||
    hasOp(PAWAPAY_AIRTEL_UGA, "PAYOUT");

  // Market rule from PawaPay: force Airtel payout off for UGA
  if (!UGA_AIRTEL_PAYOUT_SUPPORTED) {
    airtelPayout = false;
  }

  const summary: ActiveConfSummary = {
    ok: true,
    merchantId,
    merchantName,
    correspondents,
    payoutProviders,
    payoutsEnabled: mtnPayout || airtelPayout,
    airtelPayout,
    mtnPayout,
    airtelDeposit: hasOp(PAWAPAY_AIRTEL_UGA, "DEPOSIT"),
    mtnDeposit: hasOp(PAWAPAY_MTN_UGA, "DEPOSIT"),
    airtelPayoutMarketSupported: UGA_AIRTEL_PAYOUT_SUPPORTED,
    mtnPayoutMarketSupported: UGA_MTN_PAYOUT_SUPPORTED,
    raw: rawAll,
    rawPayoutConf: rawPayout,
  };

  cache = { at: Date.now(), data: summary };
  return summary;
}

export function gatewaySupportsPayout(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): boolean {
  if (gateway === "airtel_money") {
    return conf.airtelPayout && conf.airtelPayoutMarketSupported;
  }
  return conf.mtnPayout && conf.mtnPayoutMarketSupported;
}

export function gatewaySupportsDeposit(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): boolean {
  return gateway === "airtel_money" ? conf.airtelDeposit : conf.mtnDeposit;
}

export function payoutNotConfiguredMessage(
  conf: ActiveConfSummary,
  gateway: PawaPayGateway
): string {
  if (gateway === "airtel_money") {
    return (
      "Airtel (AIRTEL_OAPI_UGA) cannot be used for payouts in Uganda. " +
      "PawaPay confirmed: only MTN_MOMO_UGA supports payouts for UGA/UGX. " +
      "Choose MTN MoMo and enter an MTN number (07xx / 2567…)."
    );
  }
  if (!conf.mtnPayout) {
    return (
      "MTN payouts are supported in Uganda, but your production account is not configured for PAYOUT on MTN_MOMO_UGA yet " +
      `(active-conf PAYOUT providers: ${conf.payoutProviders.join(", ") || "none"}). ` +
      "Ask PawaPay to enable PAYOUT for MTN_MOMO_UGA on your LIVE merchant. " +
      `Merchant: ${conf.merchantName || conf.merchantId || "unknown"}.`
    );
  }
  return "Payout not available for this network.";
}

export function humanizePawaPayError(
  raw: string,
  gateway?: PawaPayGateway
): string {
  const s = String(raw || "");
  const lower = s.toLowerCase();
  if (
    lower.includes("payouts_not_allowed") ||
    lower.includes("not been configured to make payouts")
  ) {
    if (gateway === "airtel_money" || lower.includes("airtel")) {
      return (
        "Airtel cannot receive payouts in Uganda (AIRTEL_OAPI_UGA). " +
        "Use MTN MoMo + an MTN number instead. Original: " +
        s.slice(0, 160)
      );
    }
    return (
      "MTN payouts are not enabled on your production PawaPay account yet. " +
      "Ask support to enable PAYOUT for MTN_MOMO_UGA (UGA/UGX). Original: " +
      s.slice(0, 160)
    );
  }
  if (
    lower.includes("no active flow") ||
    lower.includes("active flow configuration") ||
    lower.includes("no_active") ||
    lower.includes("flow configuration")
  ) {
    return (
      `PawaPay: no active payout flow. For Uganda use MTN_MOMO_UGA only (not Airtel). ` +
      `Original: ${s.slice(0, 160)}`
    );
  }
  if (
    lower.includes("balance_insufficient") ||
    lower.includes("out_of_funds") ||
    lower.includes("insufficient")
  ) {
    return (
      `PawaPay wallet has insufficient funds for this payout. ` +
      `Original: ${s.slice(0, 120)}`
    );
  }
  return s;
}
