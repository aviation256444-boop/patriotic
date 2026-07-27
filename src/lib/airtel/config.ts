/**
 * Airtel Money Uganda — Collection API config
 * Source of truth: Sandbox Collection-API's.json (Postman)
 *
 * Sandbox (simulate):
 *   Auth:     POST https://openapi.airtel.ug/auth/oauth2/token
 *   Payments: POST https://openapi.airtel.ug/simulate/merchant/v1/payments/
 *   Enquiry:  GET  https://openapi.airtel.ug/simulate/standard/v1/payments/{id}
 *   Refund:   POST https://openapi.airtel.ug/simulate/standard/v1/payments/refund
 *
 * Production drops the /simulate prefix:
 *   POST /merchant/v1/payments/
 *   GET  /standard/v1/payments/{id}
 */

export type AirtelEnvironment = "sandbox" | "production";
export type AirtelApiVersion = "v1" | "v2";

export function getAirtelEnv(): AirtelEnvironment {
  const e = (
    process.env.AIRTEL_ENV ||
    process.env.NEXT_PUBLIC_AIRTEL_ENV ||
    "sandbox"
  )
    .toLowerCase()
    .trim();
  // accept uat/sandbox as sandbox
  if (e === "production" || e === "live") return "production";
  return "sandbox";
}

export function getAirtelApiVersion(): AirtelApiVersion {
  const v = (process.env.AIRTEL_API_VERSION || "v1").toLowerCase().trim();
  return v === "v2" ? "v2" : "v1";
}

export function isAirtelEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_AIRTEL_ENABLED ?? process.env.AIRTEL_ENABLED;
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function getAirtelCurrency(): string {
  return (process.env.AIRTEL_CURRENCY || process.env.NEXT_PUBLIC_AIRTEL_CURRENCY || "UGX").toUpperCase();
}

export function getAirtelCountry(): string {
  return (process.env.AIRTEL_COUNTRY || "UG").toUpperCase();
}

export function getAirtelConfig() {
  const env = getAirtelEnv();
  const version = getAirtelApiVersion();
  const baseUrl = (
    process.env.AIRTEL_BASE_URL || "https://openapi.airtel.ug"
  ).replace(/\/$/, "");

  // Sandbox Collection-API's.json uses /simulate/... paths
  const simulate = env === "sandbox" && process.env.AIRTEL_USE_SIMULATE !== "false";

  const collectionPath =
    process.env.AIRTEL_COLLECTION_PATH ||
    (simulate
      ? `/simulate/merchant/${version}/payments/`
      : `/merchant/${version}/payments/`);

  const statusPath =
    process.env.AIRTEL_STATUS_PATH ||
    (simulate
      ? `/simulate/standard/${version}/payments`
      : `/standard/${version}/payments`);

  const refundPath =
    process.env.AIRTEL_REFUND_PATH ||
    (simulate
      ? `/simulate/standard/${version}/payments/refund`
      : `/standard/${version}/payments/refund`);

  return {
    env,
    version,
    baseUrl,
    country: getAirtelCountry(),
    currency: getAirtelCurrency(),
    clientId: process.env.AIRTEL_CLIENT_ID || "",
    clientSecret: process.env.AIRTEL_CLIENT_SECRET || "",
    bearerToken: process.env.AIRTEL_BEARER_TOKEN || "",
    oauthPath: process.env.AIRTEL_OAUTH_PATH || "/auth/oauth2/token",
    collectionPath,
    statusPath,
    refundPath,
    simulate,
  };
}

export function hasAirtelCredentials(): boolean {
  const c = getAirtelConfig();
  return Boolean(c.bearerToken || (c.clientId && c.clientSecret));
}
