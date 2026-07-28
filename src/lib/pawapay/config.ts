/**
 * PawaPay Merchant API — config for local (sandbox) and production.
 *
 * Sandbox:  https://api.sandbox.pawapay.io
 * Live:     https://api.pawapay.io
 *
 * Localhost works for deposits + status polling (your Next server calls PawaPay).
 * Callbacks from PawaPay → your app need a public URL (ngrok / deployed domain).
 * Docs: https://docs.pawapay.io/
 */

export type PawaPayEnvironment = "sandbox" | "production";

export function getPawaPayEnv(): PawaPayEnvironment {
  const e = (
    process.env.PAWAPAY_ENV ||
    process.env.NEXT_PUBLIC_PAWAPAY_ENV ||
    "sandbox"
  )
    .toLowerCase()
    .trim();
  if (e === "production" || e === "live") return "production";
  return "sandbox";
}

/** Master switch — when true and token present, MoMo/Airtel go via PawaPay. */
export function isPawaPayEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_PAWAPAY_ENABLED ?? process.env.PAWAPAY_ENABLED;
  if (flag === "false" || flag === "0") return false;
  // Auto-enable when token is set unless explicitly disabled
  if (flag === "true" || flag === "1") return true;
  return Boolean(getPawaPayApiToken());
}

export function getPawaPayApiToken(): string {
  return (
    process.env.PAWAPAY_API_TOKEN ||
    process.env.PAWAPAY_TOKEN ||
    process.env.PAWAPAY_API_KEY ||
    ""
  ).trim();
}

export function getPawaPayBaseUrl(): string {
  const override = process.env.PAWAPAY_BASE_URL?.replace(/\/$/, "");
  if (override) return override;
  return getPawaPayEnv() === "production"
    ? "https://api.pawapay.io"
    : "https://api.sandbox.pawapay.io";
}

export function getPawaPayCountry(): string {
  // ISO 3166-1 alpha-3
  return (process.env.PAWAPAY_COUNTRY || "UGA").toUpperCase();
}

export function getPawaPayCurrency(): string {
  return (process.env.PAWAPAY_CURRENCY || process.env.NEXT_PUBLIC_PAWAPAY_CURRENCY || "UGX").toUpperCase();
}

/** Uganda MTN correspondent code */
export const PAWAPAY_MTN_UGA = "MTN_MOMO_UGA";
/** Uganda Airtel correspondent code */
export const PAWAPAY_AIRTEL_UGA = "AIRTEL_OAPI_UGA";

export function hasPawaPayCredentials(): boolean {
  return Boolean(getPawaPayApiToken());
}

/**
 * True when checkout should use PawaPay for mobile money
 * (enabled + API token). Localhost is fine — no public URL required for poll mode.
 */
export function shouldUsePawaPay(): boolean {
  return isPawaPayEnabled() && hasPawaPayCredentials();
}

export function getPawaPayConfig() {
  return {
    env: getPawaPayEnv(),
    baseUrl: getPawaPayBaseUrl(),
    token: getPawaPayApiToken(),
    country: getPawaPayCountry(),
    currency: getPawaPayCurrency(),
    enabled: isPawaPayEnabled(),
    ready: shouldUsePawaPay(),
    /** Local app URL — informational only for poll mode */
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}
